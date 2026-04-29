<template>
  <section v-if="question" class="bg-white shadow-soft p-5 md:p-8 rounded-3xl">
    <div
      class="flex sm:flex-row flex-col sm:justify-between sm:items-start gap-3 mb-6"
    >
      <div class="min-w-0">
        <p
          class="font-semibold text-blue-600 text-sm uppercase tracking-[0.2em]"
        >
          {{ prettyCategory }}
        </p>

        <h2
          class="mt-2 font-bold text-slate-900 text-xl md:text-2xl leading-snug"
        >
          {{ number }}. {{ question.question }}
        </h2>

        <p
          v-if="question.examTip"
          class="bg-amber-50 mt-3 px-4 py-3 border border-amber-200 rounded-2xl text-amber-900 text-sm leading-6"
        >
          {{ question.examTip }}
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span
          class="inline-flex bg-slate-100 px-4 py-2 rounded-full font-semibold text-slate-600 text-sm capitalize"
        >
          {{ question.difficulty || "standard" }}
        </span>
      </div>
    </div>

    <div class="space-y-3">
      <button
        v-for="(choice, index) in question.choices"
        :key="choice"
        type="button"
        class="px-4 py-4 border rounded-2xl w-full font-medium text-sm md:text-base text-left transition"
        :class="
          selectedAnswer === choice
            ? 'border-blue-600 bg-blue-50 text-blue-800'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
        "
        @click="$emit('select', choice)"
      >
        <div class="flex items-start gap-3">
          <span
            class="inline-flex justify-center items-center mt-0.5 border rounded-full w-7 h-7 font-bold text-xs shrink-0"
            :class="
              selectedAnswer === choice
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            "
          >
            {{ choiceLetter(index) }}
          </span>

          <span class="leading-6">
            {{ choice }}
          </span>
        </div>
      </button>
    </div>

    <div
      class="bg-slate-50 mt-6 px-4 py-3 rounded-2xl text-slate-600 text-sm leading-6"
    >
      Choose the best answer. For Tennessee Category 7 style practice, focus on
      label compliance, IPM, application method, safety, and structural pest
      control logic.
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  number: {
    type: Number,
    required: true,
  },
  selectedAnswer: {
    type: String,
    default: "",
  },
})

defineEmits(["select"])

const categoryLabels = {
  labelsAndSafety: "Labels & Safety",
  applicationMath: "Application Math",
  lawsAndRegulations: "Laws & Regulations",
  applicationMethods: "Application Methods",
  personalProtectiveEquipment: "PPE",
  environmentalProtection: "Environmental Protection",
  storageAndDisposal: "Storage & Disposal",
  structuralPestsAndIPM: "Structural Pests & IPM",
}

const prettyCategory = computed(() => {
  return (
    categoryLabels[props.question.category] ||
    props.question.category
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase())
  )
})

function choiceLetter(index) {
  return ["A", "B", "C", "D", "E"][index] || String(index + 1)
}
</script>
