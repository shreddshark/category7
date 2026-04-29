<script setup>
import { computed, onMounted, ref } from "vue"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/firebase"

const leaderboardEntries = ref([])
const selectedQuestionCount = ref("all")
const selectedTimeLimit = ref("all")

const questionCountOptions = [10, 25, 50, 100]

const timeLimitOptions = [
  { label: "15 Minutes", value: 15 },
  { label: "30 Minutes", value: 30 },
  { label: "1 Hour", value: 60 },
  { label: "2 Hours", value: 120 },
]

onMounted(() => {
  const leaderboardQuery = query(
    collection(db, "leaderboard"),
    orderBy("score", "desc"),
  )

  onSnapshot(leaderboardQuery, (snapshot) => {
    leaderboardEntries.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  })
})

const filteredLeaderboard = computed(() => {
  return leaderboardEntries.value
    .filter((entry) => {
      const matchesQuestions =
        selectedQuestionCount.value === "all" ||
        entry.questionCount === selectedQuestionCount.value

      const matchesTime =
        selectedTimeLimit.value === "all" ||
        entry.timeLimit === selectedTimeLimit.value

      return matchesQuestions && matchesTime
    })
    .sort((a, b) => {
      if (Number(b.score) !== Number(a.score)) {
        return Number(b.score) - Number(a.score)
      }

      const aTime = a.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER
      const bTime = b.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER

      return aTime - bTime
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))
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

function getRankBadge(rank) {
  if (rank === 1) return "bg-yellow-400 text-slate-950"
  if (rank === 2) return "bg-slate-300 text-slate-950"
  if (rank === 3) return "bg-orange-400 text-slate-950"

  return "bg-slate-800 text-slate-300"
}

function goBackHome() {
  window.location.href = "/"
}
</script>

<template>
  <main class="bg-slate-950 min-h-screen text-white">
    <section class="mx-auto px-4 md:px-8 py-8 max-w-7xl">
      <button
        type="button"
        class="mb-6 font-semibold text-slate-400 hover:text-white transition"
        @click="goBackHome"
      >
        ← Back to Exam Hub
      </button>

      <div
        class="bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_35%),linear-gradient(180deg,#020617,#0f172a)] shadow-2xl border border-slate-800 rounded-3xl overflow-hidden"
      >
        <div class="p-6 md:p-8 border-slate-800 border-b">
          <p
            class="font-semibold text-blue-400 text-sm uppercase tracking-[0.3em]"
          >
            TN Category 7
          </p>

          <div
            class="flex md:flex-row flex-col md:justify-between md:items-end gap-5 mt-3"
          >
            <div>
              <h1 class="font-black text-4xl md:text-6xl tracking-tight">
                Leaderboard
              </h1>
              <p class="mt-3 max-w-2xl text-slate-400">
                Rankings are based on highest score. Ties are broken by fastest
                completion time.
              </p>
            </div>

            <div
              class="bg-slate-900/80 px-5 py-4 border border-slate-700 rounded-2xl"
            >
              <p class="text-slate-400 text-sm">Total Entries</p>
              <p class="font-black text-blue-400 text-3xl">
                {{ filteredLeaderboard.length }}
              </p>
            </div>
          </div>

          <div class="gap-3 grid sm:grid-cols-2 mt-6 max-w-xl">
            <select
              v-model="selectedQuestionCount"
              class="bg-slate-900 px-4 py-3 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="all">All Question Counts</option>
              <option
                v-for="option in questionCountOptions"
                :key="option"
                :value="option"
              >
                {{ option }} Questions
              </option>
            </select>

            <select
              v-model="selectedTimeLimit"
              class="bg-slate-900 px-4 py-3 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="all">All Time Limits</option>
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

        <div class="overflow-x-auto">
          <table class="w-full min-w-[1000px]">
            <thead>
              <tr
                class="bg-slate-900/90 border-slate-800 border-b text-slate-400 text-xs uppercase tracking-[0.2em]"
              >
                <th class="px-6 py-4 text-left">Rank</th>
                <th class="px-6 py-4 text-left">Player</th>
                <th class="px-6 py-4 text-left">Company</th>
                <th class="px-6 py-4 text-left">District</th>
                <th class="px-6 py-4 text-center">Score</th>
                <th class="px-6 py-4 text-center">Exam</th>
                <th class="px-6 py-4 text-center">Time</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="entry in filteredLeaderboard"
                :key="entry.id"
                class="hover:bg-blue-500/5 border-slate-800 border-b transition"
              >
                <td class="px-6 py-5">
                  <div
                    class="inline-flex justify-center items-center rounded-xl w-12 h-12 font-black"
                    :class="getRankBadge(entry.rank)"
                  >
                    #{{ entry.rank }}
                  </div>
                </td>

                <td class="px-6 py-5">
                  <p class="font-bold text-cyan-300 text-lg">
                    {{ entry.name || "Unknown User" }}
                  </p>
                  <p class="text-slate-500 text-sm">
                    {{ entry.date || "Recent attempt" }}
                  </p>
                </td>

                <td class="px-6 py-5 text-slate-300">
                  {{ entry.companyName || "—" }}
                </td>

                <td class="px-6 py-5 text-slate-300">
                  {{ entry.district || "—" }}
                </td>

                <td class="px-6 py-5 text-center">
                  <p class="font-black text-blue-400 text-2xl">
                    {{ entry.score }}%
                  </p>
                </td>

                <td class="px-6 py-5 text-center">
                  <p class="font-semibold text-slate-200">
                    {{ entry.questionCount }} Qs
                  </p>
                  <p class="text-slate-500 text-sm">
                    {{ entry.timeLimitLabel || `${entry.timeLimit} Minutes` }}
                  </p>
                </td>

                <td class="px-6 py-5 text-center">
                  <p class="font-bold text-blue-300">
                    {{ formatDuration(entry.durationUsedSeconds) }}
                  </p>
                </td>
              </tr>

              <tr v-if="!filteredLeaderboard.length">
                <td colspan="7" class="px-6 py-16 text-center">
                  <p class="font-bold text-slate-300 text-xl">
                    No leaderboard scores yet
                  </p>
                  <p class="mt-2 text-slate-500">
                    Submit an exam to appear on the leaderboard.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </main>
</template>
