<template>
  <div class="top-0 z-40 sticky bg-slate-100 pb-3">
    <div class="bg-white shadow-soft p-4 md:p-6 rounded-3xl">
      <!-- Your existing header content -->
      <div class="flex justify-between items-center">
        <div>
          <p class="text-slate-500 text-sm">Question</p>
          <p class="font-bold text-slate-900">
            {{ currentNumber }} / {{ total }}
          </p>
        </div>

        <div>
          <p class="text-slate-500 text-sm">Answered</p>
          <p class="font-bold text-slate-900">{{ answered }} / {{ total }}</p>
        </div>

        <div class="text-right">
          <p class="text-slate-500 text-sm">Time Remaining</p>
          <p class="font-bold text-red-600 text-lg">
            {{ formattedTime }}
          </p>
        </div>
      </div>
    </div>
  </div>
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
