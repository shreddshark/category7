<!-- LeaderboardTable.vue -->
<script setup>
import { computed } from "vue"

const props = defineProps({
  scores: {
    type: Array,
    default: () => [],
  },
  showFull: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["view-full"])

const sortedScores = computed(() => {
  return [...props.scores].sort((a, b) => {
    if (b.scorePercent !== a.scorePercent) {
      return b.scorePercent - a.scorePercent
    }

    return a.timeSpentSeconds - b.timeSpentSeconds
  })
})

const visibleScores = computed(() => {
  return props.showFull ? sortedScores.value : sortedScores.value.slice(0, 10)
})

const formatTime = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}m ${remainingSeconds}s`
}
</script>

<template>
  <section
    class="bg-black shadow-2xl border border-slate-700 rounded-2xl overflow-hidden text-slate-200"
  >
    <div class="px-5 py-4 border-slate-700 border-b">
      <h2 class="text-slate-300 text-2xl uppercase tracking-[0.25em]">
        Leaderboard
      </h2>

      <p class="mt-1 text-slate-500 text-sm">
        Ranked by highest score, then fastest completion time.
      </p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-sm">
        <thead>
          <tr class="bg-slate-800 text-slate-100 uppercase tracking-wider">
            <th class="px-4 py-3 text-left">Position</th>
            <th class="px-4 py-3 text-left">Name</th>
            <th class="px-4 py-3 text-left">Company</th>
            <th class="px-4 py-3 text-left">District</th>
            <th class="px-4 py-3 text-center">Score</th>
            <th class="px-4 py-3 text-center">Correct</th>
            <th class="px-4 py-3 text-center">Time</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(score, index) in visibleScores"
            :key="score.id || score.userId || index"
            class="bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.55),rgba(2,6,23,0.95))] hover:bg-slate-900 border-slate-800 border-b transition"
          >
            <td class="px-4 py-3 font-semibold text-slate-100">
              #{{ index + 1 }}
            </td>

            <td class="px-4 py-3 text-cyan-300">
              {{ score.displayName || "Unknown User" }}
            </td>

            <td class="px-4 py-3 text-slate-300">
              {{ score.companyName || "—" }}
            </td>

            <td class="px-4 py-3 text-slate-300">
              {{ score.district || "—" }}
            </td>

            <td class="px-4 py-3 font-bold text-blue-300 text-center">
              {{ score.scorePercent }}%
            </td>

            <td class="px-4 py-3 text-slate-300 text-center">
              {{ score.correctAnswers }}/{{ score.totalQuestions }}
            </td>

            <td class="px-4 py-3 text-blue-300 text-center">
              {{ formatTime(score.timeSpentSeconds) }}
            </td>
          </tr>

          <tr v-if="!visibleScores.length">
            <td colspan="7" class="px-4 py-10 text-slate-500 text-center">
              No leaderboard scores yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!showFull && sortedScores.length > 10"
      class="bg-slate-950 px-5 py-4 border-slate-800 border-t text-center"
    >
      <button
        type="button"
        class="font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
        @click="emit('view-full')"
      >
        View Full Leaderboard
      </button>
    </div>
  </section>
</template>
