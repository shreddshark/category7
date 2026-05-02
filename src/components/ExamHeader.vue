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
<template>
  <div
    class="top-0 z-z-40 absolute bg-slate-100 dark:bg-slate-950 pb-3 transition-colors"
  >
    <div
      class="bg-white dark:bg-slate-900 shadow-soft p-4 md:p-6 border border-slate-200 dark:border-slate-800 rounded-3xl transition-colors"
    >
      <div class="flex justify-between items-center gap-4">
        <div>
          <p class="text-slate-500 dark:text-slate-400 text-sm">Question</p>
          <p class="font-bold text-slate-900 dark:text-white">
            {{ currentNumber }} / {{ total }}
          </p>
        </div>

        <div>
          <p class="text-slate-500 dark:text-slate-400 text-sm">Answered</p>
          <p class="font-bold text-slate-900 dark:text-white">
            {{ answered }} / {{ total }}
          </p>
        </div>

        <div class="text-right">
          <p class="text-slate-500 dark:text-slate-400 text-sm">
            Time Remaining
          </p>
          <p
            class="font-bold text-lg"
            :class="
              isLowTime
                ? 'text-red-600 dark:text-red-400'
                : 'text-red-600 dark:text-red-400'
            "
          >
            {{ formattedTime }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
