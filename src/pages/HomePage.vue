<script setup>
import { computed, onBeforeUnmount, onMounted, watch, reactive, ref } from "vue"
import DisclaimerModal from "@/components/DisclaimerModal.vue"
import ExamHeader from "@/components/ExamHeader.vue"
import QuestionCard from "@/components/QuestionCard.vue"
import ResultsSummary from "@/components/ResultsSummary.vue"
import SidebarNavigator from "@/components/SidebarNavigator.vue"
import { useExamEngine } from "@/composables/useExamEngine"

import { auth, db } from "@/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore"
import { saveLeaderboardEntry } from "@/services/leaderboardService"

const leaderboardSectionRef = ref(null)
const recentlySubmittedUid = ref(null)

const showDisclaimer = ref(false)
const agreed = ref(false)
const mobileNavOpen = ref(true)

const settingsMenuRef = ref(null)
const settingsMenuOpen = ref(false)

const questionCountOptions = [10, 25, 50, 100]
const timeLimitOptions = [
  { label: "15 Minutes", value: 15 },
  { label: "30 Minutes", value: 30 },
  { label: "1 Hour", value: 60 },
  { label: "2 Hours", value: 120 },
]

function getAuthErrorMessage(error) {
  const code = error?.code || ""
  const rawMessage = error?.message || ""

  if (
    rawMessage.includes("auth/invalid-credential") ||
    code === "auth/invalid-credential"
  ) {
    return "Invalid email or password."
  }

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/missing-email":
      return "Email is required."
    case "auth/email-already-in-use":
      return "An account already exists with this email."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/missing-password":
      return "Please enter your password."
    case "auth/operation-not-allowed":
      return "Email and password signup is not enabled yet. Please enable it in Firebase Authentication."
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later."
    case "auth/network-request-failed":
      return "Network error. Check your connection."
    default:
      return "Something went wrong. Please try again."
  }
}

const selectedQuestionCount = ref(100)
const selectedTimeLimit = ref(120)

const showAuthModal = ref(false)
const authMode = ref("login")
const showPassword = ref(false)

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("theme")

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

const theme = ref(getInitialTheme())

const isDarkMode = computed(() => theme.value === "dark")

function applyTheme() {
  document.documentElement.classList.toggle("dark", isDarkMode.value)
  localStorage.setItem("theme", theme.value)
}

function toggleTheme() {
  theme.value = isDarkMode.value ? "light" : "dark"
  applyTheme()
}

function toggleSettingsMenu() {
  settingsMenuOpen.value = !settingsMenuOpen.value
}

function closeSettingsMenu() {
  settingsMenuOpen.value = false
}

function handleDocumentClick(event) {
  if (!settingsMenuRef.value) return

  if (!settingsMenuRef.value.contains(event.target)) {
    closeSettingsMenu()
  }
}

const authForm = reactive({
  displayName: "",
  companyName: "",
  district: "",
  email: "",
  password: "",
  confirmPassword: "",
})

const user = ref(null)
const authError = ref("")
const authSuccess = ref("")
const authLoading = ref(false)

function clearAuthMessages() {
  authError.value = ""
  authSuccess.value = ""
}

function resetAuthPasswords() {
  authForm.password = ""
  authForm.confirmPassword = ""
}

watch(
  () => [authForm.email, authForm.password, authForm.confirmPassword],
  () => {
    clearAuthMessages()
  },
)

const leaderboardQuestionCount = ref(100)
const leaderboardTimeLimit = ref(120)
const showFullLeaderboard = ref(false)
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
    .slice(0, showFullLeaderboard.value ? 100 : 10)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })),
)

async function loadUserStats(uid) {
  const userScoresQuery = query(
    collection(db, "leaderboard"),
    where("uid", "==", uid),
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
      entry.uid === uid &&
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

function handleRetake() {
  resetExam() // clear current state
  initializeExam() // generates a new set of random questions
}

onMounted(() => {
  applyTheme()
  document.addEventListener("click", handleDocumentClick)

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      user.value = null
      return
    }

    await firebaseUser.reload()

    const usesPasswordProvider = firebaseUser.providerData.some(
      (provider) => provider.providerId === "password",
    )

    if (usesPasswordProvider && !firebaseUser.emailVerified) {
      await signOut(auth)
      user.value = null
      return
    }

    const userProfileSnap = await getDoc(doc(db, "users", firebaseUser.uid))
    const userProfile = userProfileSnap.exists() ? userProfileSnap.data() : {}

    const stats = await loadUserStats(firebaseUser.uid)

    user.value = {
      uid: firebaseUser.uid,
      displayName:
        userProfile.displayName || firebaseUser.displayName || "User",
      companyName: userProfile.companyName || "",
      district: userProfile.district || "",
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

  const hasSeenDisclaimer = localStorage.getItem("seenDisclaimer") === "true"

  agreed.value = hasSeenDisclaimer
  showDisclaimer.value = false
})

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick)
})

function formatDuration(seconds) {
  if (seconds === null || typeof seconds === "undefined") return "—"

  const totalSeconds = Math.max(0, Number(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

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
    companyName: user.value.companyName || "",
    district: user.value.district || "",
    score: results.value?.percent ?? results.percent,
    questionCount: selectedQuestionCount.value,
    timeLimit: selectedTimeLimit.value,
    timeLimitLabel:
      selectedTimeLimitOption?.label || `${selectedTimeLimit.value} Minutes`,
    durationUsedSeconds: results.value?.durationUsedSeconds ?? null,
  })
  const updatedStats = await loadUserStats(user.value.uid)

  user.value = {
    ...user.value,
    bestScore: updatedStats.bestScore,
    attempts: updatedStats.attempts,
    rank: updatedStats.rank,
  }

  recentlySubmittedUid.value = user.value.uid
  leaderboardQuestionCount.value = selectedQuestionCount.value
  leaderboardTimeLimit.value = selectedTimeLimit.value
}

function openAuthModal(mode) {
  authMode.value = mode
  showAuthModal.value = true
  clearAuthMessages()
}

function closeAuthModal() {
  showAuthModal.value = false
  clearAuthMessages()
}

async function handleLogin() {
  clearAuthMessages()
  authLoading.value = true

  if (!authForm.email.trim()) {
    authError.value = "Email is required."
    authLoading.value = false
    return
  }

  if (!authForm.password) {
    authError.value = "Password is required."
    authLoading.value = false
    return
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      authForm.email.trim(),
      authForm.password,
    )

    await userCredential.user.reload()

    const usesPasswordProvider = userCredential.user.providerData.some(
      (provider) => provider.providerId === "password",
    )

    if (usesPasswordProvider && !userCredential.user.emailVerified) {
      await signOut(auth)
      resetAuthPasswords()
      authError.value =
        "Please verify your email before signing in. Check your inbox for the verification link."
      return
    }

    resetAuthPasswords()
    showAuthModal.value = false
  } catch (error) {
    authError.value = getAuthErrorMessage(error)
  } finally {
    authLoading.value = false
  }
}

async function handleRegister() {
  authError.value = ""
  authLoading.value = false

  if (!authForm.displayName.trim()) {
    authError.value = "Display name is required."
    return
  }

  if (!authForm.email.trim()) {
    authError.value = "Email is required."
    return
  }

  if (!authForm.password) {
    authError.value = "Password is required."
    return
  }

  if (authForm.password.length < 6) {
    authError.value = "Password must be at least 6 characters."
    return
  }

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

    await sendEmailVerification(userCredential.user)

    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      displayName: authForm.displayName.trim(),
      companyName: authForm.companyName.trim(),
      district: authForm.district.trim(),
      email: userCredential.user.email,
      emailVerified: false,
      createdAt: new Date(),
    })

    authMode.value = "login"
    authError.value =
      "Account created! Check your email to verify before signing in."
  } catch (error) {
    console.log("Firebase register error:", error.code, error.message)
    authError.value = getAuthErrorMessage(error)
  } finally {
    authLoading.value = false
  }
}

async function handlePasswordReset() {
  clearAuthMessages()

  if (!authForm.email.trim()) {
    authError.value = "Email is required."
    return
  }

  authLoading.value = true

  try {
    await sendPasswordResetEmail(auth, authForm.email.trim())
    authSuccess.value = "Password reset email sent. Please check your inbox."
  } catch (error) {
    authError.value = getAuthErrorMessage(error)
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
  resetExam()

  agreed.value = true
  showDisclaimer.value = false
  mobileNavOpen.value = true

  setTimeout(() => {
    leaderboardSectionRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, 100)

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
  <div
    class="bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300"
  >
    <DisclaimerModal
      v-model="showDisclaimer"
      @agree="handleAgree"
      @decline="handleDecline"
    />

    <div
      v-if="showAuthModal"
      class="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/70 p-3 sm:p-4"
    >
      <div
        class="bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto transition-colors"
      >
        <div class="flex justify-between items-center gap-4 mb-6">
          <div>
            <p
              class="font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-[0.2em]"
            >
              Account
            </p>
            <h2 class="mt-1 font-bold text-slate-900 dark:text-white text-2xl">
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
            class="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl text-slate-500 dark:text-slate-300 transition shrink-0"
            @click="closeAuthModal"
          >
            ✕
          </button>
        </div>

        <p
          v-if="authError"
          class="bg-red-50 dark:bg-red-950/40 mb-4 px-4 py-3 border border-red-200 dark:border-red-900 rounded-2xl font-semibold text-red-700 dark:text-red-300 text-sm"
        >
          {{ authError }}
        </p>

        <p
          v-if="authSuccess"
          class="bg-emerald-50 dark:bg-emerald-950/40 mb-4 px-4 py-3 border border-emerald-200 dark:border-emerald-900 rounded-2xl font-semibold text-emerald-700 dark:text-emerald-300 text-sm"
        >
          {{ authSuccess }}
        </p>

        <form
          v-if="authMode === 'login'"
          class="space-y-4"
          @submit.prevent="handleLogin"
        >
          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Password
            </label>
            <input
              v-model="authForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="button"
            class="text-blue-700 dark:text-blue-400 text-sm hover:underline"
            @click="authMode = 'reset'"
          >
            Forgot password?
          </button>

          <button
            type="submit"
            :disabled="authLoading"
            class="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
          >
            {{ authLoading ? "Please wait..." : "Sign In" }}
          </button>

          <p class="text-slate-600 dark:text-slate-300 text-sm text-center">
            Need an account?
            <button
              type="button"
              class="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
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
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Display Name
            </label>
            <input
              v-model="authForm.displayName"
              type="text"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Company Name
              <span class="font-normal text-slate-400 dark:text-slate-500">
                (optional)
              </span>
            </label>
            <input
              v-model="authForm.companyName"
              type="text"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your company name"
            />
          </div>

          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              District
              <span class="font-normal text-slate-400 dark:text-slate-500">
                (optional)
              </span>
            </label>
            <input
              v-model="authForm.district"
              type="text"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your district"
            />
          </div>

          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Password
            </label>
            <input
              v-model="authForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Confirm Password
            </label>
            <input
              v-model="authForm.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            :disabled="authLoading"
            class="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
          >
            {{ authLoading ? "Please wait..." : "Create Account" }}
          </button>

          <p class="text-slate-600 dark:text-slate-300 text-sm text-center">
            Already have an account?
            <button
              type="button"
              class="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              @click="authMode = 'login'"
            >
              Sign in
            </button>
          </p>
        </form>

        <form v-else class="space-y-4" @submit.prevent="handlePasswordReset">
          <div>
            <label
              class="block mb-2 font-semibold text-slate-700 dark:text-slate-200 text-sm"
            >
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Enter your account email"
            />
          </div>

          <button
            type="submit"
            :disabled="authLoading"
            class="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
          >
            {{ authLoading ? "Please wait..." : "Send Reset Link" }}
          </button>

          <button
            type="button"
            class="w-full text-slate-600 dark:text-slate-300 text-sm hover:underline"
            @click="authMode = 'login'"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>

    <main class="mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 max-w-7xl">
      <div class="flex flex-col gap-4 mb-5 md:mb-6">
        <div class="flex justify-between items-start gap-3">
          <div class="min-w-0">
            <p
              class="font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-[0.18em]"
            >
              TN Category 7
            </p>
            <h1
              class="mt-1 font-bold text-slate-900 dark:text-white text-2xl md:text-3xl leading-tight"
            >
              Practice Exam Hub
            </h1>
          </div>

          <div ref="settingsMenuRef" class="z-[999] relative shrink-0">
            <button
              type="button"
              class="flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 px-3 sm:px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 text-sm transition"
              :aria-expanded="settingsMenuOpen"
              aria-haspopup="true"
              @click.stop="toggleSettingsMenu"
            >
              <span>⚙️</span>
              <span class="hidden sm:inline">Settings</span>
            </button>

            <div
              v-if="settingsMenuOpen"
              class="right-0 z-[999] absolute bg-white dark:bg-slate-900 shadow-2xl mt-3 p-4 border border-slate-200 dark:border-slate-800 rounded-3xl w-[calc(100vw-1.5rem)] max-w-80"
              @click.stop
            >
              <div class="mb-4">
                <p
                  class="font-semibold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-[0.2em]"
                >
                  Settings
                </p>
                <h2
                  class="mt-1 font-bold text-slate-900 dark:text-white text-lg"
                >
                  Preferences
                </h2>
              </div>

              <div
                class="flex justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl"
              >
                <div>
                  <p
                    class="font-semibold text-slate-900 dark:text-white text-sm"
                  >
                    Appearance
                  </p>
                  <p class="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                    {{
                      isDarkMode
                        ? "Dark mode is enabled"
                        : "Light mode is enabled"
                    }}
                  </p>
                </div>

                <button
                  type="button"
                  class="relative bg-slate-300 dark:bg-blue-600 rounded-full w-14 h-8 transition shrink-0"
                  role="switch"
                  :aria-checked="isDarkMode"
                  @click="toggleTheme"
                >
                  <span
                    class="top-1 absolute bg-white shadow rounded-full w-6 h-6 transition-all"
                    :class="isDarkMode ? 'left-7' : 'left-1'"
                  />
                </button>
              </div>

              <button
                type="button"
                class="hover:bg-slate-100 dark:hover:bg-slate-800 mt-4 px-4 py-2 rounded-2xl w-full font-semibold text-slate-700 dark:text-slate-200 text-sm transition"
                @click="closeSettingsMenu"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="user"
          class="flex items-center gap-3 bg-white dark:bg-slate-900 shadow-soft px-3 sm:px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl w-full"
        >
          <div
            class="flex justify-center items-center bg-blue-100 dark:bg-blue-950 rounded-full w-10 h-10 font-bold text-blue-700 dark:text-blue-300 shrink-0"
          >
            {{ user.displayName?.charAt(0)?.toUpperCase() || "U" }}
          </div>

          <div class="flex-1 min-w-0">
            <p
              class="font-semibold text-slate-900 dark:text-white text-sm truncate"
            >
              {{ user.displayName }}
            </p>
            <p class="text-slate-500 dark:text-slate-400 text-xs truncate">
              Best: {{ user.bestScore }}% • Rank #{{ user.rank }}
            </p>
          </div>

          <button
            type="button"
            class="hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 text-sm transition shrink-0"
            @click="logout"
          >
            Sign Out
          </button>
        </div>

        <div v-else class="gap-3 grid grid-cols-2">
          <button
            type="button"
            class="hover:bg-white dark:hover:bg-slate-800 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 text-sm transition"
            @click="openAuthModal('login')"
          >
            Sign In
          </button>
          <button
            type="button"
            class="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-2xl font-semibold text-white text-sm transition"
            @click="openAuthModal('register')"
          >
            Create Account
          </button>
        </div>
      </div>

      <section
        v-if="!agreed"
        class="bg-white dark:bg-slate-900 shadow-soft p-5 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 rounded-3xl text-center"
      >
        <p
          class="font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-[0.2em]"
        >
          Practice Exam
        </p>
        <h2
          class="mt-3 font-bold text-slate-900 dark:text-white text-2xl md:text-4xl"
        >
          TN Category 7 Sample Test
        </h2>
        <p
          class="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-7"
        >
          Read and accept the disclaimer to begin your timed sample exam.
        </p>
        <button
          type="button"
          class="bg-blue-600 hover:bg-blue-700 mt-6 px-6 py-3 rounded-2xl w-full sm:w-auto font-semibold text-white transition"
          @click="showDisclaimer = true"
        >
          Open Disclaimer
        </button>
      </section>

      <section
        v-else-if="!started"
        class="gap-4 md:gap-6 grid xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div
          class="bg-white dark:bg-slate-900 shadow-soft p-5 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 rounded-3xl"
        >
          <p
            class="font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-[0.2em]"
          >
            Ready to Begin
          </p>
          <h2
            class="mt-3 font-bold text-slate-900 dark:text-white text-2xl md:text-4xl leading-tight"
          >
            Start Your Practice Exam
          </h2>

          <div class="gap-3 sm:gap-4 grid sm:grid-cols-2 md:grid-cols-3 mt-5">
            <div class="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
              <p
                class="font-semibold text-slate-700 dark:text-slate-200 text-sm"
              >
                Question Pool
              </p>
              <p class="mt-2 font-bold text-slate-900 dark:text-white text-2xl">
                208
              </p>
            </div>

            <div class="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
              <p
                class="font-semibold text-slate-700 dark:text-slate-200 text-sm"
              >
                Questions Per Exam
              </p>
              <select
                v-model="selectedQuestionCount"
                class="bg-white dark:bg-slate-900 mt-2 px-3 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full font-bold text-slate-900 dark:text-white text-base transition"
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

            <div class="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
              <p
                class="font-semibold text-slate-700 dark:text-slate-200 text-sm"
              >
                Time Limit
              </p>
              <select
                v-model="selectedTimeLimit"
                class="bg-white dark:bg-slate-900 mt-2 px-3 py-3 border border-slate-300 focus:border-blue-500 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full font-bold text-slate-900 dark:text-white text-base transition"
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
            class="bg-amber-50 dark:bg-amber-950/30 mt-6 p-4 border border-amber-200 dark:border-amber-900 rounded-2xl text-amber-900 dark:text-amber-200 text-sm leading-6"
          >
            The exam will automatically submit when the timer reaches zero. Any
            unanswered questions will count against the final score.
          </div>

          <div
            v-if="!user"
            class="bg-slate-50 dark:bg-slate-800/70 mt-6 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 text-sm leading-6"
          >
            You must sign in or create an account before taking the test. This
            lets us save your scores, protect leaderboard integrity, and support
            password reset.
          </div>

          <div class="gap-3 grid sm:grid-cols-2 mt-6">
            <button
              type="button"
              class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl w-full font-semibold text-white text-center transition"
              @click="startSelectedExam"
            >
              Start Sample Test
            </button>

            <button
              v-if="!user"
              type="button"
              class="hover:bg-slate-100 dark:hover:bg-slate-800 px-6 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl w-full font-semibold text-slate-700 dark:text-slate-200 text-center transition"
              @click="openAuthModal('login')"
            >
              Sign In to Save Scores
            </button>
          </div>
        </div>

        <aside class="space-y-4 md:space-y-6">
          <div
            class="bg-white dark:bg-slate-900 shadow-soft p-5 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-3xl"
          >
            <p
              class="font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-[0.2em]"
            >
              Your Stats
            </p>
            <template v-if="user">
              <h3
                class="mt-2 font-bold text-slate-900 dark:text-white text-2xl"
              >
                {{ user.bestScore }}%
              </h3>
              <div class="gap-3 grid grid-cols-2 mt-4">
                <div class="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                  <p
                    class="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide"
                  >
                    Rank
                  </p>
                  <p
                    class="mt-1 font-bold text-slate-900 dark:text-white text-xl"
                  >
                    #{{ user.rank }}
                  </p>
                </div>
                <div class="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                  <p
                    class="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide"
                  >
                    Attempts
                  </p>
                  <p
                    class="mt-1 font-bold text-slate-900 dark:text-white text-xl"
                  >
                    {{ user.attempts }}
                  </p>
                </div>
              </div>
            </template>
            <template v-else>
              <p
                class="mt-3 text-slate-600 dark:text-slate-300 text-sm leading-6"
              >
                Create an account to save your progress, track your best score,
                and appear on the leaderboard.
              </p>
              <button
                type="button"
                class="bg-blue-600 hover:bg-blue-700 mt-4 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
                @click="openAuthModal('register')"
              >
                Join the Leaderboard
              </button>
            </template>
          </div>

          <div
            ref="leaderboardSectionRef"
            class="bg-white dark:bg-slate-900 shadow-soft p-5 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-3xl scroll-mt-6"
          >
            <div class="flex justify-between items-center gap-3">
              <div>
                <p
                  class="font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm uppercase tracking-[0.2em]"
                >
                  Leaderboard
                </p>
                <h3
                  class="mt-1 font-bold text-slate-900 dark:text-white text-xl"
                >
                  {{ showFullLeaderboard ? "Full Leaderboard" : "Top Scores" }}
                </h3>
              </div>
            </div>

            <div class="gap-2 grid grid-cols-2 mt-4">
              <select
                v-model="leaderboardQuestionCount"
                class="bg-slate-50 dark:bg-slate-800 px-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
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
                class="bg-slate-50 dark:bg-slate-800 px-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
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
              <template v-if="filteredLeaderboard.length">
                <div
                  v-for="entry in filteredLeaderboard"
                  :key="entry.id"
                  class="flex justify-between items-center gap-3 px-4 py-3 border rounded-2xl transition-all duration-500"
                  :class="
                    entry.uid === recentlySubmittedUid
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-900'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  "
                >
                  <div class="min-w-0">
                    <p
                      class="font-semibold text-slate-900 dark:text-white text-sm truncate"
                    >
                      #{{ entry.rank }} {{ entry.name }}
                    </p>

                    <p class="text-slate-500 dark:text-slate-400 text-xs">
                      {{ entry.questionCount }} questions •
                      {{ entry.timeLimitLabel }}
                    </p>

                    <p
                      v-if="entry.companyName || entry.district"
                      class="mt-1 text-slate-500 dark:text-slate-400 text-xs"
                    >
                      <span v-if="entry.companyName">
                        {{ entry.companyName }}
                      </span>
                      <span v-if="entry.companyName && entry.district">
                        •
                      </span>
                      <span v-if="entry.district">
                        District {{ entry.district }}
                      </span>
                    </p>

                    <p
                      class="mt-1 font-medium text-blue-700 dark:text-blue-400 text-xs"
                    >
                      Finished in
                      {{ formatDuration(entry.durationUsedSeconds) }}
                    </p>
                  </div>

                  <div class="text-right shrink-0">
                    <p
                      class="font-bold text-slate-900 dark:text-white text-base"
                    >
                      {{ entry.score }}%
                    </p>
                    <p class="text-slate-500 dark:text-slate-400 text-xs">
                      {{ entry.date || "Today" }}
                    </p>
                  </div>
                </div>
              </template>

              <div
                v-else
                class="bg-slate-50 dark:bg-slate-800 px-4 py-5 border border-slate-300 dark:border-slate-700 border-dashed rounded-2xl text-center"
              >
                <p
                  class="font-semibold text-slate-800 dark:text-slate-100 text-sm"
                >
                  No scores yet
                </p>
                <p class="mt-1 text-slate-500 dark:text-slate-400 text-xs">
                  Submit an exam for this question count and time limit to
                  appear here.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="hover:bg-slate-100 dark:hover:bg-slate-800 mt-4 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl w-full font-semibold text-slate-700 dark:text-slate-200 transition"
              @click="$router.push('/leaderboard')"
            >
              View Full Leaderboard
            </button>
          </div>
        </aside>
      </section>

      <section v-else-if="completed">
        <ResultsSummary
          :results="results"
          :pass-percent="passPercent"
          @go-home="goHome"
          @retake-exam="handleRetake"
        />
      </section>

      <section v-else class="space-y-4 md:space-y-6">
        <ExamHeader
          :current-number="currentIndex + 1"
          :total="questions.length"
          :answered="answeredCount"
          :formatted-time="formattedTime"
        />

        <div class="gap-4 md:gap-6 grid xl:grid-cols-[320px_minmax(0,1fr)]">
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

          <div class="space-y-4 md:space-y-6">
            <QuestionCard
              v-if="currentQuestion"
              :question="currentQuestion"
              :number="currentIndex + 1"
              :selected-answer="answers[currentQuestion.id]"
              @select="(choice) => answerQuestion(currentQuestion.id, choice)"
            />

            <div
              class="sm:flex sm:flex-row sm:justify-between gap-3 grid bg-white dark:bg-slate-900 shadow-soft p-4 md:p-6 border border-slate-200 dark:border-slate-800 rounded-3xl"
            >
              <button
                type="button"
                class="hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl w-full sm:w-auto font-semibold text-slate-700 dark:text-slate-200 transition"
                @click="prevQuestion"
              >
                Previous
              </button>

              <div class="sm:flex sm:flex-row gap-3 grid grid-cols-2">
                <button
                  type="button"
                  class="hover:bg-blue-50 dark:hover:bg-blue-950/40 px-5 py-3 border border-blue-300 dark:border-blue-800 rounded-2xl font-semibold text-blue-700 dark:text-blue-400 transition"
                  @click="nextQuestion"
                >
                  Next
                </button>
                <button
                  type="button"
                  class="bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold text-white transition"
                  @click="handleSubmitExam"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
