<script setup lang="ts">
/**
 * The model's "presence": a soft, breathing gradient blob. Big behind the
 * hero, tiny next to "Thinking". Drifts toward red as the model gets closer to AGI.
 */
const props = defineProps<{ size: "hero" | "sm"; thinking?: boolean; tier?: number }>();

const palette = computed(() =>
  (props.tier ?? 0) >= 3
    ? "from-red-500 via-orange-400 to-fuchsia-600"
    : (props.tier ?? 0) >= 2
      ? "from-fuchsia-500 via-rose-400 to-indigo-500"
      : "from-indigo-500 via-sky-400 to-fuchsia-400",
);
</script>

<template>
  <div
    v-if="size === 'hero'"
    class="pointer-events-none absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2"
    aria-hidden="true"
  >
    <div class="absolute inset-0 bg-linear-to-br opacity-50 blur-3xl" :class="[palette, thinking ? 'animate-orb-think' : 'animate-orb']" />
    <div
      class="absolute inset-10 bg-linear-to-tr opacity-40 blur-2xl [animation-direction:reverse]"
      :class="[palette, thinking ? 'animate-orb-think' : 'animate-orb']"
    />
  </div>

  <span v-else class="relative inline-grid size-4 shrink-0 place-items-center" aria-hidden="true">
    <span class="absolute inset-0 bg-linear-to-br blur-[3px]" :class="[palette, 'animate-orb-think']" />
    <span class="size-2.5 rounded-full bg-linear-to-br" :class="[palette, 'animate-orb-think']" />
  </span>
</template>
