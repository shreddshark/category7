<template>
  <header class="bg-white shadow-soft p-4 md:p-6 rounded-3xl">
    <div
      class="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4"
    >
      <div>
        <p
          class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
        >
          TN Category 7 Sample Test
        </p>
        <h1 class="font-bold text-slate-900 text-2xl md:text-3xl">
          Practice Exam Dashboard
        </h1>
      </div>

      <div class="gap-3 grid grid-cols-1 sm:grid-cols-3">
        <div class="bg-slate-100 px-4 py-3 rounded-2xl">
          <p
            class="font-semibold text-slate-500 text-xs uppercase tracking-wide"
          >
            Progress
          </p>
          <p class="mt-1 font-bold text-slate-900 text-lg">
            {{ currentNumber }} / {{ total }}
          </p>
        </div>
        <div class="bg-slate-100 px-4 py-3 rounded-2xl">
          <p
            class="font-semibold text-slate-500 text-xs uppercase tracking-wide"
          >
            Answered
          </p>
          <p class="mt-1 font-bold text-slate-900 text-lg">
            {{ answered }} / {{ total }}
          </p>
        </div>
        <div
          class="px-4 py-3 rounded-2xl"
          :class="isLowTime ? 'bg-red-100' : 'bg-slate-100'"
        >
          <p
            class="font-semibold text-slate-500 text-xs uppercase tracking-wide"
          >
            Time Left
          </p>
          <p
            class="mt-1 font-bold text-lg"
            :class="isLowTime ? 'text-red-700' : 'text-slate-900'"
          >
            {{ formattedTime }}
          </p>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  currentNumber: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  answered: {
    type: Number,
    required: true,
  },
  formattedTime: {
    type: String,
    required: true,
  },
})

const isLowTime = computed(() => props.formattedTime <= "00:15:00")
</script>
