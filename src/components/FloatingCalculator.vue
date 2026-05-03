<script setup>
import { computed, ref } from "vue"

const emit = defineEmits(["close"])

const display = ref("0")
const expression = ref("")
const position = ref({ x: 24, y: 120 })
const dragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const calculatorStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}))

function startDrag(event) {
  dragging.value = true
  const pointer = event.touches?.[0] || event

  dragOffset.value = {
    x: pointer.clientX - position.value.x,
    y: pointer.clientY - position.value.y,
  }

  window.addEventListener("mousemove", onDrag)
  window.addEventListener("mouseup", stopDrag)
  window.addEventListener("touchmove", onDrag, { passive: false })
  window.addEventListener("touchend", stopDrag)
}

function onDrag(event) {
  if (!dragging.value) return
  event.preventDefault?.()

  const pointer = event.touches?.[0] || event

  position.value = {
    x: Math.max(
      8,
      Math.min(window.innerWidth - 280, pointer.clientX - dragOffset.value.x),
    ),
    y: Math.max(
      8,
      Math.min(window.innerHeight - 380, pointer.clientY - dragOffset.value.y),
    ),
  }
}

function stopDrag() {
  dragging.value = false
  window.removeEventListener("mousemove", onDrag)
  window.removeEventListener("mouseup", stopDrag)
  window.removeEventListener("touchmove", onDrag)
  window.removeEventListener("touchend", stopDrag)
}

function press(value) {
  if (display.value === "Error") clearCalculator()

  if (display.value === "0" && ![".", "+", "-", "*", "/"].includes(value)) {
    display.value = value
    expression.value = value
    return
  }

  display.value += value
  expression.value += value
}

function clearCalculator() {
  display.value = "0"
  expression.value = ""
}

function backspace() {
  if (display.value.length <= 1 || display.value === "Error") {
    clearCalculator()
    return
  }

  display.value = display.value.slice(0, -1)
  expression.value = expression.value.slice(0, -1)
}

function calculate() {
  try {
    const safeExpression = expression.value
      .replace(/×/g, "*")
      .replace(/÷/g, "/")

    if (!/^[0-9+\-*/().\s]+$/.test(safeExpression)) {
      throw new Error()
    }

    const result = Function(`"use strict"; return (${safeExpression})`)()

    display.value = String(
      Number.isFinite(result) ? Number(result.toFixed(8)) : "Error",
    )
    expression.value = display.value
  } catch {
    display.value = "Error"
    expression.value = ""
  }
}
</script>

<template>
  <div
    class="z-[9999] fixed bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 rounded-3xl w-[272px] overflow-hidden text-slate-900 dark:text-white"
    :style="calculatorStyle"
  >
    <!-- Header -->
    <div
      class="flex justify-between items-center bg-slate-900 dark:bg-slate-800 px-4 py-3 cursor-move select-none"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <p class="font-bold text-white text-sm">Calculator</p>

      <button
        type="button"
        class="z-[10000] hover:bg-white/10 px-3 py-2 rounded-lg text-white"
        @click.stop="emit('close')"
        @touchstart.stop
      >
        ✕
      </button>
    </div>

    <!-- Display -->
    <div class="p-4">
      <div
        class="flex justify-end items-center bg-slate-100 dark:bg-slate-800 mb-4 px-4 py-4 rounded-2xl min-h-16 font-bold text-2xl text-right break-all"
      >
        {{ display }}
      </div>

      <!-- Buttons -->
      <div class="gap-2 grid grid-cols-4">
        <!-- Row 1 -->
        <button class="calc danger" @click="clearCalculator">C</button>
        <button class="calc" @click="backspace">⌫</button>
        <button class="calc" @click="press('(')">(</button>
        <button class="calc" @click="press(')')">)</button>

        <!-- Row 2 -->
        <button class="calc" @click="press('7')">7</button>
        <button class="calc" @click="press('8')">8</button>
        <button class="calc" @click="press('9')">9</button>
        <button class="calc operator" @click="press('/')">÷</button>

        <!-- Row 3 -->
        <button class="calc" @click="press('4')">4</button>
        <button class="calc" @click="press('5')">5</button>
        <button class="calc" @click="press('6')">6</button>
        <button class="calc operator" @click="press('*')">×</button>

        <!-- Row 4 -->
        <button class="calc" @click="press('1')">1</button>
        <button class="calc" @click="press('2')">2</button>
        <button class="calc" @click="press('3')">3</button>
        <button class="calc operator" @click="press('-')">−</button>

        <!-- Row 5 -->
        <button class="calc" @click="press('0')">0</button>
        <button class="calc" @click="press('.')">.</button>
        <button class="calc equals" @click="calculate">=</button>
        <button class="calc operator" @click="press('+')">+</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calc {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 1rem;
  height: 3rem;
  font-weight: bold;
  transition: all 0.2s;
}

/* Colors handled via Tailwind utility classes */
.calc {
  background-color: rgb(241 245 249);
}

.dark .calc {
  background-color: rgb(30 41 59);
}

.calc:hover {
  background-color: rgb(226 232 240);
}

.dark .calc:hover {
  background-color: rgb(51 65 85);
}

.operator {
  background-color: rgb(219 234 254);
  color: rgb(29 78 216);
}

.dark .operator {
  background-color: rgb(23 37 84);
  color: rgb(147 197 253);
}

.equals {
  background-color: rgb(37 99 235);
  color: white;
}

.equals:hover {
  background-color: rgb(29 78 216);
}

.danger {
  background-color: rgb(254 226 226);
  color: rgb(185 28 28);
}

.dark .danger {
  background-color: rgb(69 10 10);
  color: rgb(252 165 165);
}
</style>
