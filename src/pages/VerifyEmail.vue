<script setup>
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { applyActionCode } from "firebase/auth"
import { auth } from "@/firebase"

const message = ref("Verifying your email...")
const router = useRouter()

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const oobCode = params.get("oobCode")

  if (!oobCode) {
    message.value = "Invalid verification link."
    return
  }

  try {
    await applyActionCode(auth, oobCode)
    message.value = "Email verified successfully! Redirecting..."

    setTimeout(() => {
      router.push("/")
    }, 2000)
  } catch (error) {
    message.value = "Verification failed or link expired."
  }
})
</script>

<template>
  <div
    class="flex justify-center items-center bg-slate-100 dark:bg-slate-950 min-h-screen text-center"
  >
    <div
      class="bg-white dark:bg-slate-900 shadow-xl p-8 border rounded-3xl max-w-md"
    >
      <h1 class="mb-4 font-bold text-xl">Email Verification</h1>
      <p>{{ message }}</p>
    </div>
  </div>
</template>
