<script setup>
import { onMounted, ref } from "vue"
import { applyActionCode } from "firebase/auth"
import { auth } from "@/firebase"

const message = ref("Verifying your email...")
const verified = ref(false)
const error = ref(false)

function goToSignIn() {
  window.location.href = "https://category7.online/?auth=login"
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const oobCode = params.get("oobCode")

  if (!oobCode) {
    message.value = "Invalid verification link."
    error.value = true
    return
  }

  try {
    await applyActionCode(auth, oobCode)

    verified.value = true
    message.value =
      "Your email has been verified successfully. You can now sign in."
  } catch (err) {
    console.error("Email verification error:", err)

    error.value = true
    message.value =
      "Verification failed or this link has expired. Please request a new verification email."
  }
})
</script>

<template>
  <div
    class="flex justify-center items-center bg-slate-100 dark:bg-slate-950 px-4 min-h-screen text-center"
  >
    <div
      class="bg-white dark:bg-slate-900 shadow-xl p-8 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md"
    >
      <div class="mb-4 text-5xl">
        {{ verified ? "✅" : error ? "⚠️" : "📧" }}
      </div>

      <h1 class="mb-4 font-bold text-slate-900 dark:text-white text-2xl">
        Email Verification
      </h1>

      <p class="text-slate-600 dark:text-slate-300 leading-6">
        {{ message }}
      </p>

      <button
        type="button"
        class="bg-blue-600 hover:bg-blue-700 mt-6 px-5 py-3 rounded-2xl w-full font-semibold text-white transition"
        @click="goToSignIn"
      >
        Back to Sign In
      </button>
    </div>
  </div>
</template>
