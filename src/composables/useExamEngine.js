import { computed, onBeforeUnmount, ref } from "vue";
import { questionPool } from "../assets/questions";

const EXAM_LENGTH = 100;
const EXAM_DURATION_SECONDS = 2 * 60 * 60;
const PASSING_PERCENT = 70;

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

const recentIds = new Set();
const recentQuestionQueue = [];
const weakQuestionMap = new Map();

function getRecentLimit(questionCount, poolSize) {
  const expandedLimit = Math.max(
    questionCount * 2,
    Math.min(poolSize - Math.floor(questionCount / 2), 150),
  );

  return Math.min(poolSize, expandedLimit);
}

function normalizeAnswerValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "object") {
    const objectValue =
      value.value ?? value.label ?? value.text ?? value.answer ?? value.title;

    return objectValue === undefined || objectValue === null
      ? String(value)
      : String(objectValue);
  }

  return String(value);
}

function shuffleQuestionChoices(question) {
  return {
    ...question,

    // Shuffle choices once when the exam is created.
    // This fixes the issue where the correct answer always appears first
    // because the source question pool stores correct answers first.
    choices: shuffle(Array.isArray(question.choices) ? question.choices : []),

    // Keep the correct answer as a stable comparable value.
    correctAnswer: normalizeAnswerValue(question.correctAnswer),
  };
}

function rememberRecentQuestions(selectedQuestions, recentLimit) {
  selectedQuestions.forEach((question) => {
    const questionId = question.id;

    // If this question was recycled, move it to the newest position.
    // A Set alone does not update insertion order when an existing ID is added.
    if (recentIds.has(questionId)) {
      const existingIndex = recentQuestionQueue.indexOf(questionId);

      if (existingIndex !== -1) {
        recentQuestionQueue.splice(existingIndex, 1);
      }
    }

    recentIds.add(questionId);
    recentQuestionQueue.push(questionId);
  });

  // Trim old question IDs so the pool can naturally recycle over time.
  while (recentQuestionQueue.length > recentLimit) {
    const removedId = recentQuestionQueue.shift();

    recentIds.delete(removedId);
  }
}

function getAdaptiveQuestions(pool, questionCount) {
  const validPool = pool.filter((question) => {
    return question?.id !== undefined;
  });

  const safeQuestionCount = Math.min(
    Number(questionCount) || EXAM_LENGTH,
    validPool.length,
  );

  if (!safeQuestionCount) {
    return [];
  }

  const recentLimit = getRecentLimit(safeQuestionCount, validPool.length);

  // Prefer questions NOT recently used
  let availablePool = validPool.filter((q) => !recentIds.has(q.id));

  // If we don't have enough questions left,
  // only refill PART of the pool instead of all questions
  if (availablePool.length < safeQuestionCount) {
    const neededCount = safeQuestionCount - availablePool.length;

    const recycledQuestions = shuffle(
      validPool.filter((q) => recentIds.has(q.id)),
    ).slice(0, neededCount);

    availablePool = [...availablePool, ...recycledQuestions];
  }

  // Shuffle heavily BEFORE selection
  const randomized = shuffle([...availablePool]);

  // Slight weighting instead of aggressive sorting
  const scored = randomized.map((q) => {
    const weakness = weakQuestionMap.get(q.id) || 0;

    return {
      question: q,
      score: Math.random() * 100 + weakness * 5,
    };
  });

  // Randomized weighted selection
  scored.sort((a, b) => b.score - a.score);

  const selected = scored
    .slice(0, safeQuestionCount)
    .map((item) => item.question);

  // Track recently used questions
  rememberRecentQuestions(selected, recentLimit);

  // Shuffle question order and then shuffle each question's choices.
  // The question order and answer order are separate shuffles on purpose.
  return shuffle(selected).map((question) => shuffleQuestionChoices(question));
}

export function useExamEngine() {
  const fullPool = questionPool;
  const questions = ref([]);
  const answers = ref({});
  const currentIndex = ref(0);
  const started = ref(false);
  const completed = ref(false);
  const timeRemaining = ref(EXAM_DURATION_SECONDS);
  const examDurationSeconds = ref(EXAM_DURATION_SECONDS);
  const results = ref(null);

  let timerId = null;

  const currentQuestion = computed(
    () => questions.value[currentIndex.value] || null,
  );

  const answeredCount = computed(() => Object.keys(answers.value).length);

  const formattedTime = computed(() => {
    const hours = String(Math.floor(timeRemaining.value / 3600)).padStart(
      2,
      "0",
    );
    const minutes = String(
      Math.floor((timeRemaining.value % 3600) / 60),
    ).padStart(2, "0");
    const seconds = String(timeRemaining.value % 60).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  });

  function startTimer() {
    stopTimer();

    timerId = setInterval(() => {
      if (timeRemaining.value <= 1) {
        timeRemaining.value = 0;
        submitExam(true);
        return;
      }

      timeRemaining.value -= 1;
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function initializeExam(options = {}) {
    const questionCount = Number(options.questionCount ?? EXAM_LENGTH);
    const timeLimitMinutes =
      Number(options.timeLimitMinutes) || EXAM_DURATION_SECONDS / 60;

    examDurationSeconds.value = timeLimitMinutes * 60;
    timeRemaining.value = examDurationSeconds.value;

    questions.value = getAdaptiveQuestions(fullPool, questionCount);
    answers.value = {};
    currentIndex.value = 0;
    completed.value = false;
    results.value = null;
    started.value = true;

    startTimer();
  }

  function answerQuestion(questionId, choice) {
    const normalizedChoice = normalizeAnswerValue(choice);

    if (normalizedChoice === undefined) {
      return;
    }

    answers.value = {
      ...answers.value,
      [questionId]: normalizedChoice,
    };
  }

  function goToQuestion(index) {
    const targetIndex = Number(index);

    if (
      Number.isNaN(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= questions.value.length
    ) {
      return;
    }

    currentIndex.value = targetIndex;
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value += 1;
    }
  }

  function prevQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value -= 1;
    }
  }

  function submitExam(autoSubmitted = false) {
    if (completed.value) return;

    stopTimer();

    let correct = 0;
    let unanswered = 0;
    const categoryStats = {};

    questions.value.forEach((question) => {
      const userAnswer = answers.value[question.id];
      const normalizedUserAnswer = normalizeAnswerValue(userAnswer);
      const normalizedCorrectAnswer = normalizeAnswerValue(
        question.correctAnswer,
      );
      const isUnanswered = normalizedUserAnswer === undefined;
      const isCorrect =
        !isUnanswered && normalizedUserAnswer === normalizedCorrectAnswer;

      if (!categoryStats[question.category]) {
        categoryStats[question.category] = {
          total: 0,
          correct: 0,
          unanswered: 0,
        };
      }

      categoryStats[question.category].total += 1;

      if (isCorrect) {
        correct += 1;
        categoryStats[question.category].correct += 1;
        weakQuestionMap.delete(question.id);
      } else {
        weakQuestionMap.set(
          question.id,
          (weakQuestionMap.get(question.id) || 0) + 1,
        );
      }

      if (isUnanswered) {
        unanswered += 1;
        categoryStats[question.category].unanswered += 1;
      }
    });

    const incorrect = questions.value.length - correct;
    const percent = Number(
      ((correct / questions.value.length) * 100).toFixed(1),
    );

    const durationUsedSeconds = Math.max(
      0,
      examDurationSeconds.value - timeRemaining.value,
    );

    results.value = {
      autoSubmitted,
      correct,
      incorrect,
      unanswered,
      total: questions.value.length,
      percent,
      passed: percent >= PASSING_PERCENT,
      durationUsedSeconds,
      categoryStats,
      questions: questions.value,
      answers: answers.value,
    };

    completed.value = true;
  }

  function resetExam() {
    stopTimer();

    questions.value = [];
    answers.value = {};
    currentIndex.value = 0;
    started.value = false;
    completed.value = false;
    results.value = null;
    timeRemaining.value = EXAM_DURATION_SECONDS;
    examDurationSeconds.value = EXAM_DURATION_SECONDS;
  }

  onBeforeUnmount(() => {
    stopTimer();
  });

  return {
    fullPool,
    questions,
    answers,
    currentIndex,
    currentQuestion,
    started,
    completed,
    results,
    answeredCount,
    timeRemaining,
    formattedTime,
    initializeExam,
    answerQuestion,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitExam,
    resetExam,
    passPercent: PASSING_PERCENT,
  };
}
