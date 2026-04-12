<template>
  <div class="bg-slate-100 min-h-screen">
    <DisclaimerModal
      v-model="showDisclaimer"
      @agree="handleAgree"
      @decline="handleDecline"
    />

    <main class="mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <section
        v-if="!agreed"
        class="bg-white shadow-soft p-8 rounded-3xl text-center"
      >
        <p
          class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
        >
          Practice Exam
        </p>
        <h1 class="mt-3 font-bold text-slate-900 text-3xl md:text-4xl">
          TN Category 7 Sample Test
        </h1>
        <p class="mx-auto mt-4 max-w-2xl text-slate-600 text-base leading-7">
          Read and accept the disclaimer to begin your 100-question timed sample
          exam.
        </p>
        <button
          type="button"
          class="bg-emerald-600 hover:bg-emerald-700 mt-6 px-6 py-3 rounded-2xl font-semibold text-white transition"
          @click="showDisclaimer = true"
        >
          Open Disclaimer
        </button>
      </section>

      <section
        v-else-if="!started"
        class="bg-white shadow-soft p-8 rounded-3xl"
      >
        <p
          class="font-semibold text-emerald-600 text-sm uppercase tracking-[0.2em]"
        >
          Ready to Begin
        </p>
        <h1 class="mt-3 font-bold text-slate-900 text-3xl md:text-4xl">
          Start Your Practice Exam
        </h1>

        <div class="gap-4 grid md:grid-cols-3 mt-5">
          <div class="bg-slate-100 p-4 rounded-2xl">
            <p class="font-semibold text-slate-700 text-sm">Question Pool</p>
            <p class="mt-2 font-bold text-slate-900 text-2xl">200</p>
          </div>

          <div class="bg-slate-100 p-4 rounded-2xl">
            <p class="font-semibold text-slate-700 text-sm">
              Questions Per Exam
            </p>
            <p class="mt-2 font-bold text-slate-900 text-2xl">100</p>
          </div>

          <div class="bg-slate-100 p-4 rounded-2xl">
            <p class="font-semibold text-slate-700 text-sm">Time Limit</p>
            <p class="mt-2 font-bold text-slate-900 text-2xl">2 Hours</p>
          </div>
        </div>

        <div
          class="bg-amber-50 mt-6 p-4 border border-amber-200 rounded-2xl text-amber-900 text-sm leading-6"
        >
          The exam will automatically submit when the timer reaches zero. Any
          unanswered questions will count against the final score.
        </div>

        <button
          type="button"
          class="bg-emerald-600 hover:bg-emerald-700 mt-6 px-6 py-3 rounded-2xl font-semibold text-white transition"
          @click="initializeExam"
        >
          Start Sample Test
        </button>
      </section>

      <section v-else-if="completed">
        <ResultsSummary :results="results" :pass-percent="passPercent" />
      </section>

      <section v-else class="space-y-6">
        <ExamHeader
          :current-number="currentIndex + 1"
          :total="questions.length"
          :answered="answeredCount"
          :formatted-time="formattedTime"
        />

        <div class="gap-6 grid xl:grid-cols-[320px_minmax(0,1fr)]">
          <SidebarNavigator
            :questions="questions"
            :answers="answers"
            :current-index="currentIndex"
            :answered-count="answeredCount"
            :total="questions.length"
            @jump="goToQuestion"
          />

          <div class="space-y-6">
            <QuestionCard
              v-if="currentQuestion"
              :question="currentQuestion"
              :number="currentIndex + 1"
              :selected-answer="answers[currentQuestion.id]"
              @select="(choice) => answerQuestion(currentQuestion.id, choice)"
            />

            <div
              class="flex sm:flex-row flex-col sm:justify-between gap-3 bg-white shadow-soft p-4 md:p-6 rounded-3xl"
            >
              <button
                type="button"
                class="hover:bg-slate-100 px-5 py-3 border border-slate-300 rounded-2xl font-semibold text-slate-700 transition"
                @click="prevQuestion"
              >
                Previous
              </button>

              <div class="flex sm:flex-row flex-col gap-3">
                <button
                  type="button"
                  class="hover:bg-emerald-50 px-5 py-3 border border-emerald-300 rounded-2xl font-semibold text-emerald-700 transition"
                  @click="nextQuestion"
                >
                  Next
                </button>
                <button
                  type="button"
                  class="bg-slate-900 hover:bg-slate-800 px-5 py-3 rounded-2xl font-semibold text-white transition"
                  @click="submitExam(false)"
                >
                  Submit Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from "vue"
import DisclaimerModal from "./components/DisclaimerModal.vue"
import ExamHeader from "./components/ExamHeader.vue"
import QuestionCard from "./components/QuestionCard.vue"
import ResultsSummary from "./components/ResultsSummary.vue"
import SidebarNavigator from "./components/SidebarNavigator.vue"
import { useExamEngine } from "./composables/useExamEngine"

const showDisclaimer = ref(true)
const agreed = ref(false)

const {
  questions,
  answers,
  currentIndex,
  currentQuestion,
  started,
  completed,
  results,
  answeredCount,
  formattedTime,
  initializeExam,
  answerQuestion,
  goToQuestion,
  nextQuestion,
  prevQuestion,
  submitExam,
  passPercent,
} = useExamEngine()

function handleAgree() {
  agreed.value = true
  showDisclaimer.value = false
}

function handleDecline() {
  window.location.href = "https://www.google.com"
}
</script>
