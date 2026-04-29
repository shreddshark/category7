<template>
  <div
    v-if="modelValue"
    class="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/70 px-4"
  >
    <div
      ref="modalCard"
      class="bg-white shadow-soft p-6 md:p-8 rounded-3xl w-full max-w-2xl"
    >
      <div class="mb-5">
        <p
          class="mb-2 font-semibold text-blue-600 text-sm uppercase tracking-[0.2em]"
        >
          Exam Disclaimer
        </p>
        <h2 class="font-bold text-slate-900 text-2xl md:text-3xl">
          This is only a practice test
        </h2>
      </div>

      <div class="space-y-4 text-slate-600 text-sm md:text-base leading-6">
        <p>
          This website is for study and practice only. It is not the official
          Tennessee Category 7 pesticide exam, and passing this sample does not
          guarantee passing any state exam.
        </p>
        <p>
          By clicking
          <span class="font-semibold text-slate-900">I Agree</span>, you
          understand this is an unofficial sample and you want to continue to
          the test.
        </p>
      </div>

      <div class="flex sm:flex-row flex-col sm:justify-end gap-3 mt-6">
        <button
          type="button"
          class="hover:bg-slate-100 px-5 py-3 border border-slate-300 rounded-2xl font-semibold text-slate-700 transition"
          @click="handleDecline"
        >
          Leave Site
        </button>

        <button
          type="button"
          class="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold text-white transition"
          @click="handleAgree"
        >
          I Agree
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue"
import gsap from "gsap"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue", "agree", "decline"])

const modalCard = ref(null)

function handleAgree() {
  emit("update:modelValue", false)
  emit("agree")
}

function handleDecline() {
  emit("update:modelValue", false)
  emit("decline")
}

function animateIn() {
  if (!modalCard.value) return

  gsap.fromTo(
    modalCard.value,
    { y: 24, opacity: 0, scale: 0.98 },
    { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" },
  )
}

onMounted(() => {
  if (props.modelValue) {
    animateIn()
  }
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      animateIn()
    }
  },
)
</script>
