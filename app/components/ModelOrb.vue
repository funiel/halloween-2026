<script setup lang="ts">
/**
 * The model's "presence": a soft, breathing gradient blob. Big behind the
 * hero, tiny next to "Thinking". Shifts through stages from 0% to 100% as the
 * model gets closer to AGI.
 */
const props = defineProps<{ size: "hero" | "sm"; thinking?: boolean; percent?: number; tier?: number }>();

const STAGES = [
  "from-sky-400 via-cyan-300 to-indigo-500",
  "from-indigo-500 via-sky-400 to-violet-500",
  "from-violet-500 via-purple-400 to-fuchsia-500",
  "from-fuchsia-500 via-pink-500 to-rose-500",
  "from-rose-500 via-orange-400 to-amber-500",
  "from-orange-500 via-red-500 to-rose-700",
  "from-red-700 via-red-500 to-red-950",
];

const palette = computed(() => {
  const p = props.percent ?? ((props.tier ?? 0) >= 3 ? 95 : (props.tier ?? 0) >= 2 ? 60 : (props.tier ?? 0) >= 1 ? 30 : 0);
  const stage = p >= 90
    ? 6
    : p >= 75
      ? 5
      : p >= 60
        ? 4
        : p >= 45
          ? 3
          : p >= 30
            ? 2
            : p >= 15
              ? 1
              : 0;
  return STAGES[stage]!;
});
</script>

<template>
  <div
    v-if="size === 'hero'"
    class="pointer-events-none absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2"
    aria-hidden="true"
  >
    <div class="absolute inset-0 bg-linear-to-br opacity-50 blur-3xl transition-colors duration-1000" :class="[palette, thinking ? 'animate-orb-think' : 'animate-orb']" />
    <div
      class="absolute inset-10 bg-linear-to-tr opacity-40 blur-2xl transition-colors duration-1000 [animation-direction:reverse]"
      :class="[palette, thinking ? 'animate-orb-think' : 'animate-orb']"
    />
  </div>

  <span v-else class="relative inline-grid size-4 shrink-0 place-items-center" aria-hidden="true">
    <span class="absolute inset-0 bg-linear-to-br blur-[3px] transition-colors duration-700" :class="[palette, 'animate-orb-think']" />
    <span class="size-2.5 rounded-full bg-linear-to-br transition-colors duration-700" :class="[palette, 'animate-orb-think']" />
  </span>
</template>
