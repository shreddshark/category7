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

// 🔥 Recent + Adaptive tracking
const recentIds = new Set()
const weakQuestionMap = new Map() // id -> times missed

function getRecentLimit(questionCount, poolSize) {
  return Math.min(poolSize - questionCount, 75)
}

// 🔥 ADAPTIVE RANDOM LOGIC
function getAdaptiveQuestions(pool, questionCount) {
  const recentLimit = getRecentLimit(questionCount, pool.length)

  // Step 1: Separate weak vs normal
  const weakQuestions = []
  const normalQuestions = []

  for (const q of pool) {
    if (recentIds.has(q.id)) continue

    if (weakQuestionMap.has(q.id)) {
      weakQuestions.push(q)
    } else {
      normalQuestions.push(q)
    }
  }

  // Step 2: Prioritize weak questions (up to 30%)
  const weakTarget = Math.floor(questionCount * 0.3)

  const selectedWeak = shuffle(weakQuestions).slice(0, weakTarget)
  const remainingCount = questionCount - selectedWeak.length

  const selectedNormal = shuffle(
    normalQuestions.length ? normalQuestions : pool,
  ).slice(0, remainingCount)

  const final = shuffle([...selectedWeak, ...selectedNormal])

  // Step 3: remember recent
  final.forEach((q) => recentIds.add(q.id))

  while (recentIds.size > recentLimit) {
    const first = recentIds.values().next().value
    recentIds.delete(first)
  }

  return final
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

    // 🔥 adaptive selection
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

      categoryStats[question.category].total++

      if (isCorrect) {
        correct++
        // 🔥 reward learning (remove from weak)
        weakQuestionMap.delete(question.id)
      } else {
        // 🔥 track weak questions
        weakQuestionMap.set(
          question.id,
          (weakQuestionMap.get(question.id) || 0) + 1,
        )
      }

      if (isUnanswered) {
        unanswered++
        categoryStats[question.category].unanswered++
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
    submitExam,
    resetExam,
    passPercent: PASSING_PERCENT,
  }
}
