<script setup>
import { computed, ref } from "vue"

const props = defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
  questionCountOptions: {
    type: Array,
    default: () => [],
  },
  timeLimitOptions: {
    type: Array,
    default: () => [],
  },
})

const isOpen = ref(false)
const selectedQuestionCount = ref(null)
const selectedTimeLimit = ref(null)

const filteredEntries = computed(() => {
  let items = [...props.entries]

  if (selectedQuestionCount.value !== null) {
    items = items.filter(
      (entry) => entry.questionCount === selectedQuestionCount.value,
    )
  }

  if (selectedTimeLimit.value !== null) {
    items = items.filter((entry) => entry.timeLimit === selectedTimeLimit.value)
  }

  return items
    .sort((a, b) => {
      // Primary: score
      if (b.score !== a.score) return b.score - a.score

      // Secondary: fastest time
      const aDuration = a.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER
      const bDuration = b.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER
      if (aDuration !== bDuration) return aDuration - bDuration

      // Tertiary: newest date
      const aDate = a.createdAt?.seconds
        ? new Date(a.createdAt.seconds * 1000)
        : new Date(a.date || 0)

      const bDate = b.createdAt?.seconds
        ? new Date(b.createdAt.seconds * 1000)
        : new Date(b.date || 0)

      return bDate - aDate
    })
    .slice(0, 25)
    .map((entry, index) => ({
      ...entry,
      displayRank: index + 1,
    }))
})

function openLeaderboard() {
  isOpen.value = true
}

function closeLeaderboard() {
  isOpen.value = false
}

function resetFilters() {
  selectedQuestionCount.value = null
  selectedTimeLimit.value = null
}

function rankClasses(rank) {
  if (rank === 1) return "bg-yellow-100 text-yellow-800"
  if (rank === 2) return "bg-slate-200 text-slate-700"
  if (rank === 3) return "bg-orange-100 text-orange-800"
  return "bg-slate-100 text-slate-700"
}

function rankLabel(rank) {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `#${rank}`
}
</script>

<template>
  <div>
    <button
      type="button"
      class="hover:bg-slate-100 px-5 py-3 border border-slate-300 rounded-2xl font-semibold text-slate-700 transition"
      @click="openLeaderboard"
    >
      View Leaderboard
    </button>

    <div
      v-if="isOpen"
      class="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/50 p-4"
    >
      <div
        class="bg-white shadow-2xl rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        <!-- HEADER -->
        <div
          class="flex sm:flex-row flex-col justify-between sm:items-center gap-4 p-6 md:p-8 border-b"
        >
          <div>
            <p
              class="font-semibold text-blue-600 text-sm uppercase tracking-[0.2em]"
            >
              Leaderboard
            </p>
            <h2 class="mt-1 font-bold text-slate-900 text-2xl md:text-3xl">
              Top 25 Test Takers
            </h2>
            <p class="mt-2 text-slate-600 text-sm">
              Ranked by highest score, then fastest completion time.
            </p>
          </div>

          <button
            class="hover:bg-slate-100 p-3 rounded-2xl text-slate-500"
            @click="closeLeaderboard"
          >
            ✕
          </button>
        </div>

        <!-- BODY -->
        <div class="p-6 md:p-8 overflow-y-auto">
          <!-- FILTERS -->
          <div class="gap-3 grid sm:grid-cols-[1fr_1fr_auto] mb-6">
            <select v-model="selectedQuestionCount" class="input">
              <option :value="null">All Question Counts</option>
              <option
                v-for="option in questionCountOptions"
                :key="option"
                :value="option"
              >
                {{ option }} Questions
              </option>
            </select>

            <select v-model="selectedTimeLimit" class="input">
              <option :value="null">All Time Limits</option>
              <option
                v-for="option in timeLimitOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <button class="btn-secondary" @click="resetFilters">Reset</button>
          </div>

          <!-- LIST -->
          <div v-if="filteredEntries.length" class="space-y-3">
            <div
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="flex sm:flex-row flex-col justify-between items-center gap-4 bg-slate-50 p-4 border rounded-2xl"
            >
              <div class="flex items-center gap-4">
                <div
                  class="flex justify-center items-center rounded-full w-12 h-12 font-bold"
                  :class="rankClasses(entry.displayRank)"
                >
                  {{ rankLabel(entry.displayRank) }}
                </div>

                <div>
                  <p class="font-semibold">{{ entry.name }}</p>
                  <p class="text-slate-500 text-sm">
                    {{ entry.questionCount }} questions •
                    {{ entry.timeLimitLabel }}
                  </p>
                </div>
              </div>

              <div class="gap-6 grid grid-cols-2 text-sm">
                <div>
                  <p class="text-slate-500">Score</p>
                  <p class="font-bold text-lg">{{ entry.score }}%</p>
                </div>

                <div>
                  <p class="text-slate-500">Date</p>
                  <p class="font-semibold">
                    {{ entry.date || "—" }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- EMPTY -->
          <div v-else class="py-8 text-center">
            <p class="font-semibold text-lg">No leaderboard entries found</p>
            <p class="mt-2 text-slate-500 text-sm">
              Submit a test to appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
