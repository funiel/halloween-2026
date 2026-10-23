<script setup lang="ts">
/**
 * Press and hold to confirm: a ring and a fill grow while you hold, with a
 * haptic tick every quarter. Let go early and it drains back. Impossible to
 * trigger by accident from a pocket.
 */
const props = withDefaults(defineProps<{ duration?: number }>(), { duration: 1200 });
const emit = defineEmits<{ confirm: [] }>();

const progress = ref(0);
const done = ref(false);
let raf = 0;
let start = 0;
let ticks = 0;

function hold(e: PointerEvent) {
  if (done.value) return;
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    // Not a capturable pointer; holding still works without capture.
  }
  cancelAnimationFrame(raf);
  start = performance.now() - progress.value * props.duration;
  ticks = Math.floor(progress.value * 4);
  const step = (now: number) => {
    progress.value = Math.min(1, (now - start) / props.duration);
    if (Math.floor(progress.value * 4) > ticks) {
      ticks++;
      navigator.vibrate?.(10);
    }
    if (progress.value >= 1) {
      done.value = true;
      navigator.vibrate?.([30, 40, 60]);
      emit("confirm");
      setTimeout(() => {
        done.value = false;
        progress.value = 0;
      }, 900);
      return;
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function release() {
  if (done.value) return;
  cancelAnimationFrame(raf);
  // Drain back smoothly.
  const from = progress.value;
  const t0 = performance.now();
  const drain = (now: number) => {
    progress.value = Math.max(0, from - (now - t0) / 350);
    if (progress.value > 0) raf = requestAnimationFrame(drain);
  };
  raf = requestAnimationFrame(drain);
}
onBeforeUnmount(() => cancelAnimationFrame(raf));

const R = 10;
const CIRC = 2 * Math.PI * R;
</script>

<template>
  <button
    type="button"
    class="relative w-full touch-none overflow-hidden rounded-2xl py-4 text-lg font-black text-black select-none transition-transform"
    :class="[progress > 0 && !done && 'scale-[0.98]', done && 'animate-pop']"
    @pointerdown="hold"
    @pointerup="release"
    @pointerleave="release"
    @pointercancel="release"
    @contextmenu.prevent
  >
    <span class="absolute inset-0 origin-left bg-white/45" :style="{ transform: `scaleX(${progress})` }" />
    <span class="relative flex items-center justify-center gap-2.5">
      <svg viewBox="0 0 24 24" class="size-6 -rotate-90">
        <circle cx="12" cy="12" :r="R" fill="none" stroke="rgb(0 0 0 / 0.2)" stroke-width="3" />
        <circle
          cx="12"
          cy="12"
          :r="R"
          fill="none"
          stroke="black"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="CIRC"
          :stroke-dashoffset="CIRC * (1 - progress)"
        />
      </svg>
      <span>{{ done ? "Revealed!" : progress > 0 ? "Keep holding…" : "" }}<slot v-if="!progress && !done" /></span>
    </span>
  </button>
</template>
