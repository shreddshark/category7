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
      (entry) =>
        Number(entry.questionCount) === Number(selectedQuestionCount.value),
    )
  }

  if (selectedTimeLimit.value !== null) {
    items = items.filter(
      (entry) => Number(entry.timeLimit) === Number(selectedTimeLimit.value),
    )
  }

  return items
    .sort((a, b) => {
      const aDate = getEntryDate(a)
      const bDate = getEntryDate(b)

      // Test history should show the newest completed attempt first.
      return bDate - aDate
    })
    .map((entry, index) => ({
      ...entry,
      displayNumber: index + 1,
    }))
})

function getEntryDate(entry) {
  if (entry.createdAt?.seconds) {
    return new Date(entry.createdAt.seconds * 1000)
  }

  if (entry.createdAt) {
    return new Date(entry.createdAt)
  }

  if (entry.date) {
    return new Date(entry.date)
  }

  return new Date(0)
}

function formatDate(entry) {
  const date = getEntryDate(entry)

  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return "—"
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatTime(entry) {
  const date = getEntryDate(entry)

  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return "—"
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds)

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "—"
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

function openHistory() {
  isOpen.value = true
}

function closeHistory() {
  isOpen.value = false
}

function resetFilters() {
  selectedQuestionCount.value = null
  selectedTimeLimit.value = null
}

function resultClasses(entry) {
  if (entry.passed) {
    return "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200"
  }

  return "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200"
}

function resultLabel(entry) {
  return entry.passed ? "Passed" : "Did Not Pass"
}
</script>

<template>
  <div>
    <button
      type="button"
      class="hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 transition"
      @click="openHistory"
    >
      View Test History
    </button>

    <div
      v-if="isOpen"
      class="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/70 p-4"
    >
      <div
        class="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden transition-colors"
      >
        <div
          class="flex sm:flex-row flex-col justify-between sm:items-center gap-4 p-6 md:p-8 border-slate-200 dark:border-slate-800 border-b"
        >
          <div>
            <p
              class="font-semibold text-blue-600 dark:text-blue-400 text-sm uppercase tracking-[0.2em]"
            >
              Test History
            </p>
            <h2
              class="mt-1 font-bold text-slate-900 dark:text-white text-2xl md:text-3xl"
            >
              Completed Test Attempts
            </h2>
            <p class="mt-2 text-slate-600 dark:text-slate-300 text-sm">
              Every completed test attempt is saved here with score, date, and
              completion time.
            </p>
          </div>

          <button
            type="button"
            class="hover:bg-slate-100 dark:hover:bg-slate-800 p-3 rounded-2xl text-slate-500 dark:text-slate-300 transition"
            @click="closeHistory"
          >
            ✕
          </button>
        </div>

        <div class="p-6 md:p-8 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div class="gap-3 grid sm:grid-cols-[1fr_1fr_auto] mb-6">
            <select
              v-model="selectedQuestionCount"
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full font-semibold text-slate-900 dark:text-white transition"
            >
              <option :value="null">All Question Counts</option>
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
              class="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-full font-semibold text-slate-900 dark:text-white transition"
            >
              <option :value="null">All Time Limits</option>
              <option
                v-for="option in timeLimitOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <button
              type="button"
              class="hover:bg-slate-100 dark:hover:bg-slate-800 px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 transition"
              @click="resetFilters"
            >
              Reset
            </button>
          </div>

          <div v-if="filteredEntries.length" class="space-y-3">
            <div
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="flex lg:flex-row flex-col justify-between lg:items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl transition-colors"
            >
              <div class="flex items-center gap-4">
                <div
                  class="flex justify-center items-center bg-slate-100 dark:bg-slate-700 rounded-full w-12 h-12 font-bold text-slate-700 dark:text-slate-200 shrink-0"
                >
                  #{{ entry.displayNumber }}
                </div>

                <div>
                  <p class="font-semibold text-slate-900 dark:text-white">
                    {{ entry.name || "Test Attempt" }}
                  </p>
                  <p class="text-slate-500 dark:text-slate-400 text-sm">
                    {{ entry.questionCount }} questions •
                    {{ entry.timeLimitLabel || `${entry.timeLimit} minutes` }}
                  </p>
                </div>
              </div>

              <div class="gap-6 grid grid-cols-2 md:grid-cols-4 text-sm">
                <div>
                  <p class="text-slate-500 dark:text-slate-400">Score</p>
                  <p class="font-bold text-slate-900 dark:text-white text-lg">
                    {{ entry.score }}%
                  </p>
                </div>

                <div>
                  <p class="text-slate-500 dark:text-slate-400">Result</p>
                  <span
                    class="inline-flex mt-1 px-3 py-1 rounded-full font-bold text-xs"
                    :class="resultClasses(entry)"
                  >
                    {{ resultLabel(entry) }}
                  </span>
                </div>

                <div>
                  <p class="text-slate-500 dark:text-slate-400">Time</p>
                  <p class="font-semibold text-slate-900 dark:text-white">
                    {{ formatDuration(entry.durationUsedSeconds) }}
                  </p>
                </div>

                <div>
                  <p class="text-slate-500 dark:text-slate-400">Date</p>
                  <p class="font-semibold text-slate-900 dark:text-white">
                    {{ formatDate(entry) }}
                  </p>
                  <p class="text-slate-500 dark:text-slate-400 text-xs">
                    {{ formatTime(entry) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="py-8 text-center">
            <p class="font-semibold text-slate-900 dark:text-white text-lg">
              No test history found
            </p>
            <p class="mt-2 text-slate-500 dark:text-slate-400 text-sm">
              Complete a test to add a new attempt here.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
