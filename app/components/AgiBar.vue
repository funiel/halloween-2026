<script setup lang="ts">
const props = defineProps<{ percent: number; delta: number }>();

// Start at the old value, then slide to the new one, so the bump is visible.
const width = ref(Math.max(0, props.percent - props.delta));
onMounted(() => setTimeout(() => (width.value = props.percent), 80));
</script>

<template>
  <div class="h-1.5 overflow-hidden rounded-full bg-ink-700">
    <div
      class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300 transition-[width] duration-[1400ms] ease-out"
      :style="{ width: `${width}%` }"
    />
  </div>
</template>
