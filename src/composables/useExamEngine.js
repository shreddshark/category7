import { computed, onBeforeUnmount, ref } from "vue"
import { questionPool } from "../assets/questions"

const EXAM_LENGTH = 100
const EXAM_DURATION_SECONDS = 2 * 60 * 60
const PASSING_PERCENT = 70

function getRandomIndex(max) {
  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1)
    window.crypto.getRandomValues(array)
    return array[0] % max
  }

  return Math.floor(Math.random() * max)
}

function shuffle(array) {
  const copy = [...array]

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = getRandomIndex(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

function getRandomExamQuestions(pool, questionCount) {
  const uniqueQuestions = []
  const usedIds = new Set()
  const usedQuestionText = new Set()

  for (const question of shuffle(pool)) {
    const normalizedText = question.question.trim().toLowerCase()

    if (usedIds.has(question.id)) continue
    if (usedQuestionText.has(normalizedText)) continue

    usedIds.add(question.id)
    usedQuestionText.add(normalizedText)
    uniqueQuestions.push(question)

    if (uniqueQuestions.length === questionCount) {
      break
    }
  }

  return shuffle(uniqueQuestions)
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

    questions.value = getRandomExamQuestions(fullPool, questionCount)

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
    if (index >= 0 && index < questions.value.length) {
      currentIndex.value = index
    }
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
