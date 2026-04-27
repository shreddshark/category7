<script setup>
import { computed, onMounted, reactive, ref } from "vue"
import DisclaimerModal from "./components/DisclaimerModal.vue"
import ExamHeader from "./components/ExamHeader.vue"
import QuestionCard from "./components/QuestionCard.vue"
import ResultsSummary from "./components/ResultsSummary.vue"
import SidebarNavigator from "./components/SidebarNavigator.vue"
import { useExamEngine } from "./composables/useExamEngine"

//firebase imports
import { auth, db } from "@/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth"
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore"
import { saveLeaderboardEntry } from "@/services/leaderboardService"
const leaderboardSectionRef = ref(null)
const recentlySubmittedUid = ref(null)

const showDisclaimer = ref(false)
const agreed = ref(false)
const mobileNavOpen = ref(true)

const questionCountOptions = [10, 25, 50, 100]
const timeLimitOptions = [
  { label: "15 Minutes", value: 15 },
  { label: "30 Minutes", value: 30 },
  { label: "1 Hour", value: 60 },
  { label: "2 Hours", value: 120 },
]

const selectedQuestionCount = ref(100)
const selectedTimeLimit = ref(120)

const showAuthModal = ref(false)
const authMode = ref("login")
const showPassword = ref(false)

const authForm = reactive({
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
})

const user = ref(null)
const authError = ref("")
const authLoading = ref(false)

async function loadUserStats(firebaseUser) {
  const userScoresQuery = query(
    collection(db, "leaderboard"),
    where("uid", "==", firebaseUser.uid),
  )

  const allScoresQuery = query(collection(db, "leaderboard"))

  const [userSnapshot, allSnapshot] = await Promise.all([
    getDocs(userScoresQuery),
    getDocs(allScoresQuery),
  ])

  const userEntries = userSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  if (!userEntries.length) {
    return {
      bestScore: 0,
      attempts: 0,
      rank: "-",
    }
  }

  const allEntries = allSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  const sortedEntries = allEntries
    .map((entry) => ({
      ...entry,
      score: Number(entry.score ?? entry.percent ?? 0),
      durationUsedSeconds: entry.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.durationUsedSeconds - b.durationUsedSeconds
    })

  const userBestEntry = userEntries
    .map((entry) => ({
      ...entry,
      score: Number(entry.score ?? entry.percent ?? 0),
      durationUsedSeconds: entry.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.durationUsedSeconds - b.durationUsedSeconds
    })[0]

  const bestScore = userBestEntry.score
  const attempts = userEntries.reduce(
    (total, entry) => total + Number(entry.attempts || 1),
    0,
  )

  const rankIndex = sortedEntries.findIndex(
    (entry) =>
      entry.uid === firebaseUser.uid &&
      entry.score === userBestEntry.score &&
      entry.questionCount === userBestEntry.questionCount &&
      entry.timeLimit === userBestEntry.timeLimit,
  )

  return {
    bestScore,
    attempts,
    rank: rankIndex >= 0 ? rankIndex + 1 : "-",
  }
}

onMounted(() => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      user.value = null
      return
    }

    const stats = await loadUserStats(firebaseUser)

    user.value = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "User",
      email: firebaseUser.email,
      bestScore: stats.bestScore,
      attempts: stats.attempts,
      rank: stats.rank,
    }
  })

  const leaderboardQuery = query(
    collection(db, "leaderboard"),
    orderBy("score", "desc"),
  )

  onSnapshot(leaderboardQuery, (snapshot) => {
    leaderboardEntries.value = snapshot.docs.map((doc, index) => ({
      id: doc.id,
      rank: index + 1,
      ...doc.data(),
    }))
  })
})

const leaderboardQuestionCount = ref(100)
const leaderboardTimeLimit = ref(120)

const leaderboardEntries = ref([])

const filteredLeaderboard = computed(() =>
  leaderboardEntries.value
    .filter(
      (entry) =>
        entry.questionCount === leaderboardQuestionCount.value &&
        entry.timeLimit === leaderboardTimeLimit.value,
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      const aDuration = a.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER
      const bDuration = b.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER

      return aDuration - bDuration
    })
    .slice(0, 5)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })),
)

const {
  questions,
  answers,
  currentIndex,
  currentQuestion,
  started,
  completed,
  results,
  answeredCount,
  formattedTime,
  initializeExam,
  answerQuestion,
  goToQuestion,
  nextQuestion,
  prevQuestion,
  submitExam,
  passPercent,
  resetExam,
} = useExamEngine()

async function handleSubmitExam() {
  submitExam(false)

  const selectedTimeLimitOption = timeLimitOptions.find(
    (option) => option.value === selectedTimeLimit.value,
  )

  if (!user.value) return

  await saveLeaderboardEntry({
    uid: user.value.uid,
    name: user.value.displayName || "Anonymous",
    score: results.value?.percent ?? results.percent,
    questionCount: selectedQuestionCount.value,
    timeLimit: selectedTimeLimit.value,
    timeLimitLabel:
      selectedTimeLimitOption?.label || `${selectedTimeLimit.value} Minutes`,
    durationUsedSeconds: results.value?.durationUsedSeconds ?? null,
  })

  recentlySubmittedUid.value = user.value.uid
  leaderboardQuestionCount.value = selectedQuestionCount.value
  leaderboardTimeLimit.value = selectedTimeLimit.valuealue
  leaderboardTimeLimit.value = selectedTimeLimit.value
}

function openAuthModal(mode) {
  authMode.value = mode
  showAuthModal.value = true
}

function closeAuthModal() {
  showAuthModal.value = false
}

async function handleLogin() {
  authError.value = ""
  authLoading.value = true

  try {
    await signInWithEmailAndPassword(
      auth,
      authForm.email.trim(),
      authForm.password,
    )

    showAuthModal.value = false
  } catch (error) {
    authError.value = error.message
  } finally {
    authLoading.value = false
  }
}

async function handleRegister() {
  authError.value = ""

  if (authForm.password !== authForm.confirmPassword) {
    authError.value = "Passwords do not match."
    return
  }

  authLoading.value = true

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      authForm.email.trim(),
      authForm.password,
    )

    await updateProfile(userCredential.user, {
      displayName: authForm.displayName.trim(),
    })

    user.value = {
      uid: userCredential.user.uid,
      displayName: authForm.displayName.trim(),
      email: userCredential.user.email,
      bestScore: 0,
      rank: "-",
      attempts: 0,
    }

    showAuthModal.value = false
  } catch (error) {
    authError.value = error.message
  } finally {
    authLoading.value = false
  }
}

async function handlePasswordReset() {
  authError.value = ""
  authLoading.value = true

  try {
    await sendPasswordResetEmail(auth, authForm.email.trim())
    authError.value = "Password reset email sent."
  } catch (error) {
    authError.value = error.message
  } finally {
    authLoading.value = false
  }
}

async function logout() {
  await signOut(auth)
  user.value = null
}

function startSelectedExam() {
  if (!user.value) {
    openAuthModal("login")
    return
  }

  initializeExam({
    questionCount: selectedQuestionCount.value,
    timeLimitMinutes: selectedTimeLimit.value,
  })
}

function goHome() {
  console.log("GO HOME CLICKED") // debug

  // Reset exam state (now defined)
  resetExam()

  // Go back to homepage (NOT disclaimer)
  agreed.value = true
  showDisclaimer.value = false
  mobileNavOpen.value = true

  // Smooth scroll to leaderboard
  setTimeout(() => {
    leaderboardSectionRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, 100)

  // Remove highlight after a few seconds
  setTimeout(() => {
    recentlySubmittedUid.value = null
  }, 4000)
}

function retakeExam() {
  if (!user.value) {
    openAuthModal("login")
    return
  }

  if (typeof resetExam === "function") {
    resetExam()
  }

  initializeExam({
    questionCount: selectedQuestionCount.value,
    timeLimitMinutes: selectedTimeLimit.value,
  })
}

onMounted(() => {
  const hasSeenDisclaimer = localStorage.getItem("seenDisclaimer")

  if (!hasSeenDisclaimer) {
    showDisclaimer.value = true
  } else {
    agreed.value = true
  }
})

function handleAgree() {
  agreed.value = true
  showDisclaimer.value = false
  localStorage.setItem("seenDisclaimer", "true")
}

function handleDecline() {
  showDisclaimer.value = false
  window.location.href = "https://www.google.com"
}
</script>
<template>
  <div class="bg-slate-100 min-h-screen">
    <DisclaimerModal
      v-model="showDisclaimer"
      @agree="handleAgree"
      @decline="handleDecline"
    />

    <div
      v-if="showAuthModal"
      class="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/50 p-4"
    >
      <div class="bg-white shadow-2xl p-6 md:p-8 rounded-3xl w-full max-w-md">
        <div class="flex justify-between items-center gap-4 mb-6">
          <div>
            <p
              class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
            >
              Account
            </p>
            <h2 class="mt-1 font-bold text-slate-900 text-2xl">
              {{
                authMode === "login"
                  ? "Sign In"
                  : authMode === "register"
                    ? "Create Account"
                    : "Reset Password"
              }}
            </h2>
          </div>

          <button
            type="button"
            class="hover:bg-slate-100 p-2 rounded-xl text-slate-500"
            @click="closeAuthModal"
          >
            ✕
          </button>
        </div>

        <p
          v-if="authError"
          class="bg-red-50 mb-4 px-4 py-3 border border-red-200 rounded-2xl font-semibold text-red-700 text-sm"
        >
          {{ authError }}
        </p>

        <form
          v-if="authMode === 'login'"
          class="space-y-4"
          @submit.prevent="handleLogin"
        >
          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Password
            </label>
            <input
              v-model="authForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="button"
            class="text-emerald-700 text-sm hover:underline"
            @click="authMode = 'reset'"
          >
            Forgot password?
          </button>

          <button
            type="submit"
            :disabled="authLoading"
            class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
          >
            {{ authLoading ? "Please wait..." : "Sign In" }}
          </button>

          <p class="text-slate-600 text-sm text-center">
            Need an account?
            <button
              type="button"
              class="font-semibold text-emerald-700 hover:underline"
              @click="authMode = 'register'"
            >
              Create one
            </button>
          </p>
        </form>

        <form
          v-else-if="authMode === 'register'"
          class="space-y-4"
          @submit.prevent="handleRegister"
        >
          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Display Name
            </label>
            <input
              v-model="authForm.displayName"
              type="text"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Password
            </label>
            <input
              v-model="authForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Confirm Password
            </label>
            <input
              v-model="authForm.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            class="bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
          >
            Create Account
          </button>

          <p class="text-slate-600 text-sm text-center">
            Already have an account?
            <button
              type="button"
              class="font-semibold text-emerald-700 hover:underline"
              @click="authMode = 'login'"
            >
              Sign in
            </button>
          </p>
        </form>

        <form v-else class="space-y-4" @submit.prevent="handlePasswordReset">
          <div>
            <label class="block mb-2 font-semibold text-slate-700 text-sm">
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              class="px-4 py-3 border border-slate-300 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
              placeholder="Enter your account email"
            />
          </div>

          <button
            type="submit"
            class="bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
          >
            Send Reset Link
          </button>

          <button
            type="button"
            class="w-full text-slate-600 text-sm hover:underline"
            @click="authMode = 'login'"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>

    <main class="mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <div
        class="flex sm:flex-row flex-col justify-between items-center gap-4 mb-6"
      >
        <div>
          <p
            class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
          >
            TN Category 7
          </p>
          <h1 class="mt-1 font-bold text-slate-900 text-2xl md:text-3xl">
            Practice Exam Hub
          </h1>
        </div>

        <div
          v-if="user"
          class="flex items-center gap-3 bg-white shadow-soft px-4 py-3 rounded-2xl"
        >
          <div
            class="flex justify-center items-center bg-emerald-100 rounded-full w-10 h-10 font-bold text-emerald-700"
          >
            {{ user.displayName?.charAt(0)?.toUpperCase() || "U" }}
          </div>
          <div>
            <p class="font-semibold text-slate-900 text-sm">
              {{ user.displayName }}
            </p>
            <p class="text-slate-500 text-xs">
              Best: {{ user.bestScore }}% • Rank #{{ user.rank }}
            </p>
          </div>
          <button
            type="button"
            class="hover:bg-slate-100 px-3 py-2 rounded-xl text-slate-700 text-sm transition"
            @click="logout"
          >
            Sign Out
          </button>
        </div>

        <div v-else class="flex flex-wrap gap-3">
          <button
            type="button"
            class="hover:bg-white px-4 py-2 border border-slate-300 rounded-2xl font-semibold text-slate-700 transition"
            @click="openAuthModal('login')"
          >
            Sign In
          </button>
          <button
            type="button"
            class="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-2xl font-semibold text-white transition"
            @click="openAuthModal('register')"
          >
            Create Account
          </button>
        </div>
      </div>

      <section
        v-if="!agreed"
        class="bg-white shadow-soft p-8 rounded-3xl text-center"
      >
        <p
          class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
        >
          Practice Exam
        </p>
        <h2 class="mt-3 font-bold text-slate-900 text-3xl md:text-4xl">
          TN Category 7 Sample Test
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-slate-600 text-base leading-7">
          Read and accept the disclaimer to begin your timed sample exam.
        </p>
        <button
          type="button"
          class="bg-emerald-600 hover:bg-emerald-700 mt-6 px-6 py-3 rounded-2xl font-semibold text-white transition"
          @click="showDisclaimer = true"
        >
          Open Disclaimer
        </button>
      </section>

      <section
        v-else-if="!started"
        class="gap-6 grid xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div class="bg-white shadow-soft p-8 rounded-3xl">
          <p
            class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
          >
            Ready to Begin
          </p>
          <h2 class="mt-3 font-bold text-slate-900 text-3xl md:text-4xl">
            Start Your Practice Exam
          </h2>

          <div class="gap-4 grid md:grid-cols-3 mt-5">
            <div class="bg-slate-100 p-4 rounded-2xl">
              <p class="font-semibold text-slate-700 text-sm">Question Pool</p>
              <p class="mt-2 font-bold text-slate-900 text-2xl">200</p>
            </div>

            <div class="bg-slate-100 p-4 rounded-2xl">
              <p class="font-semibold text-slate-700 text-sm">
                Questions Per Exam
              </p>
              <select
                v-model="selectedQuestionCount"
                class="bg-white mt-2 px-3 py-2 border border-slate-300 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full font-bold text-slate-900 text-lg transition"
              >
                <option
                  v-for="option in questionCountOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </div>

            <div class="bg-slate-100 p-4 rounded-2xl">
              <p class="font-semibold text-slate-700 text-sm">Time Limit</p>
              <select
                v-model="selectedTimeLimit"
                class="bg-white mt-2 px-3 py-2 border border-slate-300 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full font-bold text-slate-900 text-lg transition"
              >
                <option
                  v-for="option in timeLimitOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <div
            class="bg-amber-50 mt-6 p-4 border border-amber-200 rounded-2xl text-amber-900 text-sm leading-6"
          >
            The exam will automatically submit when the timer reaches zero. Any
            unanswered questions will count against the final score.
          </div>
          <div
            v-if="!user"
            class="bg-slate-50 mt-6 p-4 border border-slate-200 rounded-2xl text-slate-700 text-sm leading-6"
          >
            You must sign in or create an account before taking the test. This
            lets us save your scores, protect leaderboard integrity, and support
            password reset.
          </div>
          <div class="flex sm:flex-row flex-col gap-3 mt-6">
            <div class="flex sm:flex-row flex-col gap-3 mt-6">
              <button
                type="button"
                class="flex-1 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl font-semibold text-white text-center transition"
                @click="startSelectedExam"
              >
                Start Sample Test
              </button>

              <button
                v-if="!user"
                type="button"
                class="flex-1 hover:bg-slate-100 px-6 py-3 border border-slate-300 rounded-2xl font-semibold text-slate-700 text-center transition"
                @click="openAuthModal('login')"
              >
                Sign In to Save Scores
              </button>
            </div>
          </div>
        </div>

        <aside class="space-y-6">
          <div class="bg-white shadow-soft p-6 rounded-3xl">
            <p
              class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
            >
              Your Stats
            </p>
            <template v-if="user">
              <h3 class="mt-2 font-bold text-slate-900 text-2xl">
                {{ user.bestScore }}%
              </h3>
              <div class="gap-3 grid grid-cols-2 mt-4">
                <div class="bg-slate-100 p-4 rounded-2xl">
                  <p class="text-slate-500 text-xs uppercase tracking-wide">
                    Rank
                  </p>
                  <p class="mt-1 font-bold text-slate-900 text-xl">
                    #{{ user.rank }}
                  </p>
                </div>
                <div class="bg-slate-100 p-4 rounded-2xl">
                  <p class="text-slate-500 text-xs uppercase tracking-wide">
                    Attempts
                  </p>
                  <p class="mt-1 font-bold text-slate-900 text-xl">
                    {{ user.attempts }}
                  </p>
                </div>
              </div>
            </template>
            <template v-else>
              <p class="mt-3 text-slate-600 leading-6">
                Create an account to save your progress, track your best score,
                and appear on the leaderboard.
              </p>
              <button
                type="button"
                class="bg-emerald-600 hover:bg-emerald-700 mt-4 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
                @click="openAuthModal('register')"
              >
                Join the Leaderboard
              </button>
            </template>
          </div>

          <div
            ref="leaderboardSectionRef"
            class="bg-white shadow-soft p-6 rounded-3xl scroll-mt-6"
          >
            <div class="flex justify-between items-center gap-3">
              <div>
                <p
                  class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
                >
                  Leaderboard
                </p>
                <h3 class="mt-1 font-bold text-slate-900 text-xl">
                  Top Scores
                </h3>
              </div>
            </div>

            <div class="gap-2 grid grid-cols-2 mt-4">
              <select
                v-model="leaderboardQuestionCount"
                class="bg-slate-50 px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm"
              >
                <option
                  v-for="option in questionCountOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }} Qs
                </option>
              </select>

              <select
                v-model="leaderboardTimeLimit"
                class="bg-slate-50 px-3 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm"
              >
                <option
                  v-for="option in timeLimitOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="space-y-3 mt-5">
              <div class="space-y-3 mt-5">
                <div class="space-y-3 mt-5">
                  <div
                    v-if="filteredLeaderboard.length"
                    v-for="entry in filteredLeaderboard"
                    :key="entry.id"
                    class="flex justify-between items-center px-4 py-3 border rounded-2xl transition-all duration-500"
                    :class="
                      entry.uid === recentlySubmittedUid
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100'
                        : 'bg-slate-50 border-slate-200'
                    "
                  >
                    <div class="min-w-0">
                      <p class="font-semibold text-slate-900 truncate">
                        #{{ entry.rank }} {{ entry.name }}
                      </p>
                      <p class="text-slate-500 text-sm">
                        {{ entry.questionCount }} questions •
                        {{ entry.timeLimitLabel }}
                      </p>
                    </div>

                    <div class="text-right">
                      <p class="font-bold text-slate-900 text-lg">
                        {{ entry.score }}%
                      </p>
                      <p class="text-slate-500 text-xs">
                        {{ entry.date || "Today" }}
                      </p>
                    </div>
                  </div>

                  <div
                    v-else
                    class="bg-slate-50 px-4 py-5 border border-slate-300 border-dashed rounded-2xl text-center"
                  >
                    <p class="font-semibold text-slate-800 text-sm">
                      No scores yet
                    </p>
                    <p class="mt-1 text-slate-500 text-xs">
                      Submit an exam for this question count and time limit to
                      appear here.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section v-else-if="completed">
        <ResultsSummary
          :results="results"
          :pass-percent="passPercent"
          @go-home="goHome"
          @retake-exam="retakeExam"
        />
      </section>

      <section v-else class="space-y-6">
        <ExamHeader
          :current-number="currentIndex + 1"
          :total="questions.length"
          :answered="answeredCount"
          :formatted-time="formattedTime"
        />

        <div class="gap-6 grid xl:grid-cols-[320px_minmax(0,1fr)]">
          <SidebarNavigator
            :questions="questions"
            :answers="answers"
            :current-index="currentIndex"
            :answered-count="answeredCount"
            :total="questions.length"
            :is-open="mobileNavOpen"
            @jump="goToQuestion"
            @toggle="mobileNavOpen = !mobileNavOpen"
          />

          <div class="space-y-6">
            <QuestionCard
              v-if="currentQuestion"
              :question="currentQuestion"
              :number="currentIndex + 1"
              :selected-answer="answers[currentQuestion.id]"
              @select="(choice) => answerQuestion(currentQuestion.id, choice)"
            />

            <div
              class="flex sm:flex-row flex-col sm:justify-between gap-3 bg-white shadow-soft p-4 md:p-6 rounded-3xl"
            >
              <button
                type="button"
                class="hover:bg-slate-100 px-5 py-3 border border-slate-300 rounded-2xl font-semibold text-slate-700 transition"
                @click="prevQuestion"
              >
                Previous
              </button>

              <div class="flex sm:flex-row flex-col gap-3">
                <button
                  type="button"
                  class="hover:bg-emerald-50 px-5 py-3 border border-emerald-300 rounded-2xl font-semibold text-emerald-700 transition"
                  @click="nextQuestion"
                >
                  Next
                </button>
                <button
                  type="button"
                  class="bg-slate-900 hover:bg-slate-800 px-5 py-3 rounded-2xl font-semibold text-white transition"
                  @click="handleSubmitExam"
                >
                  Submit Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
