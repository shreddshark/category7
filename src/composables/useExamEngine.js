import { computed, onBeforeUnmount, ref } from "vue"
import { questionPool, categoryWeights } from "../assets/questions"

const EXAM_LENGTH = 100
const EXAM_DURATION_SECONDS = 2 * 60 * 60
const PASSING_PERCENT = 70

function shuffle(array) {
  const copy = [...array]

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

function allocateCounts(weights, total) {
  const entries = Object.entries(weights)
  const totalWeight = entries.reduce((sum, [, value]) => sum + value, 0)

  const raw = entries.map(([category, weight]) => ({
    category,
    exact: (weight / totalWeight) * total,
  }))

  const counts = raw.map((item) => ({
    category: item.category,
    count: Math.floor(item.exact),
    remainder: item.exact - Math.floor(item.exact),
  }))

  let assigned = counts.reduce((sum, item) => sum + item.count, 0)

  while (assigned < total) {
    counts.sort((a, b) => b.remainder - a.remainder)
    counts[0].count += 1
    counts[0].remainder = 0
    assigned += 1
  }

  return counts.reduce((acc, item) => {
    acc[item.category] = item.count
    return acc
  }, {})
}

function selectWeightedQuestions(pool, weights, total) {
  const grouped = pool.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = []
    }

    acc[question.category].push(question)
    return acc
  }, {})

  const allocation = allocateCounts(weights, total)
  const selected = []
  const usedIds = new Set()
  const usedQuestionText = new Set()

  function addUniqueQuestions(sourceQuestions, countNeeded) {
    const added = []

    for (const question of shuffle(sourceQuestions)) {
      const normalizedText = question.question.trim().toLowerCase()

      if (usedIds.has(question.id)) continue
      if (usedQuestionText.has(normalizedText)) continue

      usedIds.add(question.id)
      usedQuestionText.add(normalizedText)
      added.push(question)

      if (added.length === countNeeded) {
        break
      }
    }

    return added
  }

  Object.entries(allocation).forEach(([category, needed]) => {
    const available = grouped[category] || []
    const uniqueQuestions = addUniqueQuestions(available, needed)
    selected.push(...uniqueQuestions)
  })

  if (selected.length < total) {
    const remainingPool = pool.filter((question) => {
      const normalizedText = question.question.trim().toLowerCase()
      return !usedIds.has(question.id) && !usedQuestionText.has(normalizedText)
    })

    const fillerQuestions = addUniqueQuestions(
      remainingPool,
      total - selected.length,
    )
    selected.push(...fillerQuestions)
  }

  return shuffle(selected).slice(0, total)
}

export function useExamEngine() {
  const fullPool = questionPool
  const questions = ref([])
  const answers = ref({})
  const currentIndex = ref(0)
  const started = ref(false)
  const completed = ref(false)
  const timeRemaining = ref(EXAM_DURATION_SECONDS)
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
    const questionCount = options.questionCount ?? EXAM_LENGTH
    const timeLimitMinutes =
      options.timeLimitMinutes ?? EXAM_DURATION_SECONDS / 60

    questions.value = selectWeightedQuestions(
      fullPool,
      categoryWeights,
      questionCount,
    )

    answers.value = {}
    currentIndex.value = 0
    completed.value = false
    results.value = null
    timeRemaining.value = timeLimitMinutes * 60
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

    results.value = {
      autoSubmitted,
      correct,
      incorrect,
      unanswered,
      total: questions.value.length,
      percent,
      passed: percent >= PASSING_PERCENT,
      categoryStats,
      questions: questions.value,
      answers: answers.value,
    }

    completed.value = true
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

  function resetExam() {
    stopTimer()

    questions.value = []
    answers.value = {}
    currentIndex.value = 0
    started.value = false
    completed.value = false
    results.value = null
    timeRemaining.value = EXAM_DURATION_SECONDS
  }

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
