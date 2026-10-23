<script setup lang="ts">
/** The AGI progress card in a reply: counts up from the old value, sparkles when it crosses a milestone. */
const props = defineProps<{ percent: number; delta: number; version: string }>();

const from = Math.max(0, props.percent - props.delta);
const shown = ref(from);
const width = ref(from);

const MILESTONES = [25, 50, 75];
const crossed = MILESTONES.filter((m) => from < m && props.percent >= m);
const sparkles = ref<{ id: number; at: number; dx: string; dy: string; delay: string }[]>([]);

onMounted(() => {
  setTimeout(() => (width.value = props.percent), 80);
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1400);
    shown.value = from + (props.percent - from) * (1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  // Sparkles fire roughly when the bar passes each milestone.
  crossed.forEach((m) => {
    const when = 80 + ((m - from) / Math.max(0.01, props.percent - from)) * 1100;
    setTimeout(() => {
      sparkles.value.push(
        ...Array.from({ length: 10 }, (_, i) => ({
          id: m * 100 + i,
          at: m,
          dx: `${Math.round((Math.random() - 0.5) * 70)}px`,
          dy: `${Math.round(-12 - Math.random() * 34)}px`,
          delay: `${Math.round(Math.random() * 120)}ms`,
        })),
      );
    }, when);
  });
});
</script>

<template>
  <div class="mb-3 rounded-2xl bg-ink-800 p-3">
    <div class="mb-2 flex items-baseline justify-between text-sm">
      <span class="font-medium text-ink-300">AGI progress</span>
      <span class="font-mono tabular-nums">
        {{ shown.toFixed(2) }}%
        <span v-if="delta > 0" class="text-emerald-400">+{{ delta.toFixed(2) }}%</span>
      </span>
    </div>
    <div class="relative">
      <div class="h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div
          class="h-full rounded-full bg-linear-to-r from-emerald-500 to-lime-300 shadow-[0_0_12px_rgb(163_230_53/0.6)] transition-[width] duration-[1400ms] ease-out"
          :style="{ width: `${width}%` }"
        />
      </div>
      <span
        v-for="m in MILESTONES"
        :key="m"
        class="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-500/50"
        :style="{ left: `${m}%` }"
      />
      <span
        v-for="s in sparkles"
        :key="s.id"
        class="animate-sparkle pointer-events-none absolute top-0 text-[11px] text-lime-200"
        :style="{ left: `${s.at}%`, '--dx': s.dx, '--dy': s.dy, animationDelay: s.delay }"
      >
        ✦
      </span>
    </div>
    <div class="mt-2 flex justify-between font-mono text-xs text-ink-500">
      <span>Model updated to v{{ version }}</span>
      <span v-if="crossed.length" class="text-lime-300">Milestone: {{ crossed.at(-1) }}%</span>
    </div>
  </div>
</template>
