<template>
  <aside class="bg-white shadow-soft p-4 md:p-5 rounded-3xl">
    <div class="flex justify-between items-center gap-3">
      <div class="min-w-0">
        <h3 class="font-bold text-slate-900 text-lg">Question Navigator</h3>
        <p class="font-medium text-slate-500 text-sm">
          {{ answeredCount }}/{{ total }} answered
        </p>
      </div>

      <button
        type="button"
        class="md:hidden inline-flex items-center hover:bg-slate-100 px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 text-sm transition shrink-0"
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
    return "border-emerald-600 bg-emerald-600 text-white"
  }

  if (isAnswered) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
  }

  return "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
}
</script>
