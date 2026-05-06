import { computed, onBeforeUnmount, ref } from "vue"
import { questionPool } from "../assets/questions"

const EXAM_LENGTH = 100
const EXAM_DURATION_SECONDS = 2 * 60 * 60
const PASSING_PERCENT = 70

function shuffle(array) {
  const copy = [...array]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

const recentIds = new Set()
const weakQuestionMap = new Map()

function getRecentLimit(questionCount, poolSize) {
  return Math.max(
    questionCount * 2,
    Math.min(poolSize - Math.floor(questionCount / 2), 150),
  )
}

function getAdaptiveQuestions(pool, questionCount) {
  const safeQuestionCount = Math.min(
    Number(questionCount) || EXAM_LENGTH,
    pool.length,
  )

  const recentLimit = getRecentLimit(safeQuestionCount, pool.length)

  // Prefer questions NOT recently used
  let availablePool = pool.filter((q) => !recentIds.has(q.id))

  // If we don't have enough questions left,
  // only refill PART of the pool instead of all questions
  if (availablePool.length < safeQuestionCount) {
    const recentArray = Array.from(recentIds)

    const recycledQuestions = shuffle(
      pool.filter((q) => recentArray.includes(q.id)),
    ).slice(0, safeQuestionCount - availablePool.length)

    availablePool = [...availablePool, ...recycledQuestions]
  }

  // Shuffle heavily BEFORE selection
  const randomized = shuffle([...availablePool])

  // Slight weighting instead of aggressive sorting
  const scored = randomized.map((q) => {
    const weakness = weakQuestionMap.get(q.id) || 0

    return {
      question: q,
      score: Math.random() * 100 + weakness * 5,
    }
  })

  // Randomized weighted selection
  scored.sort((a, b) => b.score - a.score)

  const selected = scored
    .slice(0, safeQuestionCount)
    .map((item) => item.question)

  // Track recently used questions
  selected.forEach((q) => recentIds.add(q.id))

  // Trim recent history
  const idsArray = Array.from(recentIds)

  if (idsArray.length > recentLimit) {
    const trimmed = idsArray.slice(idsArray.length - recentLimit)

    recentIds.clear()

    trimmed.forEach((id) => recentIds.add(id))
  }

  return shuffle(selected)
}

export function useExamEngine() {
  const fullPool = questionPool
  const questions = ref([])
  const answers = ref({})
  const currentIndex = ref(0)
  const started = ref(false)
  const completed = ref(false)
  const timeRemaining = ref(EXAM_DURATION_SECONDS)
  const examDurationSeconds = ref(EXAM_DURATION_SECONDS)
  const results = ref(null)

  let timerId = null

  const currentQuestion = computed(
    () => questions.value[currentIndex.value] || null,
  )

  const answeredCount = computed(() => Object.keys(answers.value).length)

  const formattedTime = computed(() => {
    const hours = String(Math.floor(timeRemaining.value / 3600)).padStart(
      2,
      "0",
    )
    const minutes = String(
      Math.floor((timeRemaining.value % 3600) / 60),
    ).padStart(2, "0")
    const seconds = String(timeRemaining.value % 60).padStart(2, "0")

    return `${hours}:${minutes}:${seconds}`
  })

  function startTimer() {
    stopTimer()

    timerId = setInterval(() => {
      if (timeRemaining.value <= 1) {
        timeRemaining.value = 0
        submitExam(true)
        return
      }

      timeRemaining.value -= 1
    }, 1000)
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }

  function initializeExam(options = {}) {
    const questionCount = Number(options.questionCount ?? EXAM_LENGTH)
    const timeLimitMinutes =
      Number(options.timeLimitMinutes) || EXAM_DURATION_SECONDS / 60

    examDurationSeconds.value = timeLimitMinutes * 60
    timeRemaining.value = examDurationSeconds.value

    questions.value = getAdaptiveQuestions(fullPool, questionCount)
    answers.value = {}
    currentIndex.value = 0
    completed.value = false
    results.value = null
    started.value = true

    startTimer()
  }

  function answerQuestion(questionId, choice) {
    answers.value = {
      ...answers.value,
      [questionId]: choice,
    }
  }

  function goToQuestion(index) {
    const targetIndex = Number(index)

    if (
      Number.isNaN(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= questions.value.length
    ) {
      return
    }

    currentIndex.value = targetIndex
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value += 1
    }
  }

  function prevQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value -= 1
    }
  }

  function submitExam(autoSubmitted = false) {
    if (completed.value) return

    stopTimer()

    let correct = 0
    let unanswered = 0
    const categoryStats = {}

    questions.value.forEach((question) => {
      const userAnswer = answers.value[question.id]
      const isCorrect = userAnswer === question.correctAnswer
      const isUnanswered = typeof userAnswer === "undefined"

      if (!categoryStats[question.category]) {
        categoryStats[question.category] = {
          total: 0,
          correct: 0,
          unanswered: 0,
        }
      }

      categoryStats[question.category].total += 1

      if (isCorrect) {
        correct += 1
        categoryStats[question.category].correct += 1
        weakQuestionMap.delete(question.id)
      } else {
        weakQuestionMap.set(
          question.id,
          (weakQuestionMap.get(question.id) || 0) + 1,
        )
      }

      if (isUnanswered) {
        unanswered += 1
        categoryStats[question.category].unanswered += 1
      }
    })

    const incorrect = questions.value.length - correct
    const percent = Number(
      ((correct / questions.value.length) * 100).toFixed(1),
    )

    const durationUsedSeconds = Math.max(
      0,
      examDurationSeconds.value - timeRemaining.value,
    )

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
    }

    completed.value = true
  }

  function resetExam() {
    stopTimer()

    questions.value = []
    answers.value = {}
    currentIndex.value = 0
    started.value = false
    completed.value = false
    results.value = null
    timeRemaining.value = EXAM_DURATION_SECONDS
    examDurationSeconds.value = EXAM_DURATION_SECONDS
  }

  onBeforeUnmount(() => {
    stopTimer()
  })

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
  }
}
