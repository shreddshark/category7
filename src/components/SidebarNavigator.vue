<script setup>
const props = defineProps({
  questions: {
    type: Array,
    required: true,
  },
  answers: {
    type: Object,
    required: true,
  },
  currentIndex: {
    type: Number,
    required: true,
  },
  answeredCount: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

defineEmits(["jump", "toggle"])

function buttonClass(questionId, index) {
  const isCurrent = props.currentIndex === index
  const isAnswered = typeof props.answers[questionId] !== "undefined"

  if (isCurrent) {
    return "border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white"
  }

  if (isAnswered) {
    return "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/60"
  }

  return "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
}
</script>
<template>
  <aside
    class="bg-white dark:bg-slate-900 shadow-soft p-4 md:p-5 border border-slate-200 dark:border-slate-800 rounded-3xl transition-colors"
  >
    <div class="flex justify-between items-center gap-3">
      <div class="min-w-0">
        <h3 class="font-bold text-slate-900 dark:text-white text-lg">
          Question Navigator
        </h3>
        <p class="font-medium text-slate-500 dark:text-slate-400 text-sm">
          {{ answeredCount }}/{{ total }} answered
        </p>
      </div>

      <button
        type="button"
        class="md:hidden inline-flex items-center hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 text-sm transition shrink-0"
        @click="$emit('toggle')"
      >
        {{ isOpen ? "Hide" : "Show" }}
      </button>
    </div>

    <div v-show="isOpen" class="gap-2 grid grid-cols-5 sm:grid-cols-6 mt-4">
      <button
        v-for="(question, index) in questions"
        :key="question.id"
        type="button"
        class="flex justify-center items-center border rounded-xl w-full h-11 font-bold text-sm transition"
        :class="buttonClass(question.id, index)"
        @click="$emit('jump', index)"
      >
        {{ index + 1 }}
      </button>
    </div>
  </aside>
</template>
