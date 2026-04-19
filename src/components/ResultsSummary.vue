<script setup>
import { ref } from "vue"

const props = defineProps({
  results: {
    type: Object,
    required: true,
  },
  passPercent: {
    type: Number,
    required: true,
  },
})

defineEmits(["go-home", "retake-exam"])

const isSummaryOpen = ref(false)

function formatCategory(category) {
  return category
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
}

function isCorrect(question) {
  return props.results.answers[question.id] === question.correctAnswer
}

function isUnanswered(question) {
  return typeof props.results.answers[question.id] === "undefined"
}

function badgeLabel(question) {
  if (isUnanswered(question)) return "Unanswered"
  if (isCorrect(question)) return "Correct"
  return "Incorrect"
}

function badgeClass(question) {
  if (isUnanswered(question)) return "bg-amber-100 text-amber-800"
  if (isCorrect(question)) return "bg-emerald-100 text-emerald-800"
  return "bg-red-100 text-red-800"
}
</script>

<template>
  <section class="space-y-6">
    <div class="bg-white shadow-soft p-6 md:p-8 rounded-3xl">
      <p
        class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
      >
        Final Result
      </p>

      <div
        class="flex md:flex-row flex-col md:justify-between md:items-end gap-4 mt-3"
      >
        <div>
          <h2 class="font-bold text-slate-900 text-3xl md:text-4xl">
            {{ results.percent }}%
          </h2>
          <p class="mt-2 text-slate-600 text-base">
            {{ results.passed ? "Passed" : "Did Not Pass" }} — minimum passing
            score is {{ passPercent }}%
          </p>
          <p
            v-if="results.autoSubmitted"
            class="mt-2 font-medium text-amber-700 text-sm"
          >
            Time expired, so the exam was submitted automatically.
          </p>
        </div>

        <div class="gap-3 grid grid-cols-2 md:grid-cols-4">
          <div class="bg-slate-100 px-4 py-3 rounded-2xl">
            <p class="text-slate-500 text-xs uppercase tracking-wide">
              Correct
            </p>
            <p class="mt-1 font-bold text-slate-900 text-xl">
              {{ results.correct }}
            </p>
          </div>

          <div class="bg-slate-100 px-4 py-3 rounded-2xl">
            <p class="text-slate-500 text-xs uppercase tracking-wide">
              Incorrect
            </p>
            <p class="mt-1 font-bold text-slate-900 text-xl">
              {{ results.incorrect }}
            </p>
          </div>

          <div class="bg-slate-100 px-4 py-3 rounded-2xl">
            <p class="text-slate-500 text-xs uppercase tracking-wide">
              Unanswered
            </p>
            <p class="mt-1 font-bold text-slate-900 text-xl">
              {{ results.unanswered }}
            </p>
          </div>

          <div class="bg-slate-100 px-4 py-3 rounded-2xl">
            <p class="text-slate-500 text-xs uppercase tracking-wide">Total</p>
            <p class="mt-1 font-bold text-slate-900 text-xl">
              {{ results.total }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex sm:flex-row flex-col gap-3 mt-6">
        <button
          type="button"
          class="hover:bg-slate-100 px-5 py-3 border border-slate-300 rounded-2xl font-semibold text-slate-700 transition"
          @click="$emit('go-home')"
        >
          Return Home
        </button>

        <button
          type="button"
          class="bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-2xl font-semibold text-white transition"
          @click="$emit('retake-exam')"
        >
          Retake Exam
        </button>
      </div>
    </div>

    <div class="bg-white shadow-soft rounded-3xl overflow-hidden">
      <button
        type="button"
        class="flex justify-between items-center hover:bg-slate-50 px-6 md:px-8 py-5 w-full text-left transition"
        @click="isSummaryOpen = !isSummaryOpen"
      >
        <span class="font-bold text-slate-900 text-xl">
          Test Summary Breakdown
        </span>

        <span
          class="text-slate-500 text-2xl leading-none transition-transform duration-200"
          :class="{ 'rotate-180': isSummaryOpen }"
        >
          ˅
        </span>
      </button>

      <div v-show="isSummaryOpen" class="px-6 md:px-8 pb-6 md:pb-8">
        <div class="gap-4 grid md:grid-cols-2 mt-2">
          <div
            v-for="(stats, category) in results.categoryStats"
            :key="category"
            class="p-4 border border-slate-200 rounded-2xl"
          >
            <p
              class="font-semibold text-emerald-600 text-sm uppercase tracking-wide"
            >
              {{ formatCategory(category) }}
            </p>

            <div class="gap-3 grid grid-cols-3 mt-3 text-sm">
              <div>
                <p class="text-slate-500">Total</p>
                <p class="font-bold text-slate-900">{{ stats.total }}</p>
              </div>

              <div>
                <p class="text-slate-500">Correct</p>
                <p class="font-bold text-slate-900">{{ stats.correct }}</p>
              </div>

              <div>
                <p class="text-slate-500">Unanswered</p>
                <p class="font-bold text-slate-900">{{ stats.unanswered }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white shadow-soft p-6 md:p-8 rounded-3xl">
      <h3 class="font-bold text-slate-900 text-xl">Answer Review</h3>

      <div class="space-y-4 mt-5">
        <article
          v-for="(question, index) in results.questions"
          :key="question.id"
          class="p-4 border border-slate-200 rounded-2xl"
        >
          <div
            class="flex md:flex-row flex-col md:justify-between md:items-start gap-3"
          >
            <div>
              <p
                class="font-semibold text-emerald-600 text-sm uppercase tracking-wide"
              >
                {{ index + 1 }}. {{ formatCategory(question.category) }}
              </p>
              <h4 class="mt-1 font-bold text-slate-900 text-base">
                {{ question.question }}
              </h4>
            </div>

            <span
              class="inline-flex px-3 py-1 rounded-full font-bold text-xs"
              :class="badgeClass(question)"
            >
              {{ badgeLabel(question) }}
            </span>
          </div>

          <div class="gap-3 grid md:grid-cols-2 mt-4">
            <div class="bg-slate-100 p-3 rounded-xl">
              <p class="text-slate-500 text-xs uppercase tracking-wide">
                Your Answer
              </p>
              <p class="mt-1 font-semibold text-slate-900">
                {{ results.answers[question.id] || "Unanswered" }}
              </p>
            </div>

            <div class="bg-emerald-50 p-3 rounded-xl">
              <p class="text-emerald-700 text-xs uppercase tracking-wide">
                Correct Answer
              </p>
              <p class="mt-1 font-semibold text-emerald-900">
                {{ question.correctAnswer }}
              </p>
            </div>
          </div>

          <p class="mt-3 text-slate-600 text-sm leading-6">
            {{ question.explanation }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
