<script setup lang="ts">
/**
 * Odometer digits: every digit is its own 0–9 column that rolls into place,
 * each at its own speed. Rolls in from zero on first show.
 */
const props = defineProps<{ value: string }>();

const ready = ref(false);
onMounted(() => setTimeout(() => (ready.value = true), 120));

// Keyed from the right, so "9.99 → 10.00" keeps the decimals' columns stable.
const chars = computed(() => [...props.value].map((c, i, all) => ({ c, key: all.length - i, i })));
</script>

<template>
  <span class="inline-flex leading-none">
    <span class="sr-only">{{ value }}</span>
    <template v-for="{ c, key, i } in chars" :key="key">
      <span v-if="/\d/.test(c)" class="relative inline-block h-[1em] w-[0.6em] overflow-hidden" aria-hidden="true">
        <span
          class="absolute inset-x-0 top-0 flex flex-col text-center transition-transform ease-[cubic-bezier(0.2,0.9,0.25,1.04)]"
          :style="{
            transform: `translateY(-${ready ? Number(c) : 0}em)`,
            transitionDuration: `${650 + i * 170}ms`,
          }"
        >
          <span v-for="d in 10" :key="d" class="h-[1em]">{{ d - 1 }}</span>
        </span>
      </span>
      <span v-else aria-hidden="true">{{ c }}</span>
    </template>
  </span>
</template>
