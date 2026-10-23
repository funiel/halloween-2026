<script setup lang="ts">
const { toasts } = useToast();
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-[100] flex flex-col items-center gap-2 px-4"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-300"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="max-w-sm rounded-2xl bg-ink-100 px-4 py-2.5 text-center text-sm font-medium text-ink-900 shadow-lg"
      >
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>
