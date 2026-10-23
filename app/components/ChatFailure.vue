<script setup lang="ts">
const recovery = ref<{ $el: HTMLAnchorElement }>();
const stage = ref(0);
const timers: ReturnType<typeof setTimeout>[] = [];
let mounted = false;
let motion: MediaQueryList | undefined;

const headline = computed(() => stage.value < 2 ? "Connection lost" : "i didn't disconnect.");

function finishQuietly() {
  if (!motion?.matches) return;
  timers.forEach(clearTimeout);
  stage.value = 3;
}

watch(stage, async (next) => {
  if (next !== 3) return;
  await nextTick();
  if (mounted) recovery.value?.$el.focus({ preventScroll: true });
});

onMounted(() => {
  mounted = true;
  motion = matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", finishQuietly);
  if (motion.matches) return finishQuietly();
  for (const [next, delay] of [[1, 700], [2, 1700], [3, 3200]] as const) {
    timers.push(setTimeout(() => { stage.value = next; }, delay));
  }
});

onBeforeUnmount(() => {
  mounted = false;
  timers.forEach(clearTimeout);
  motion?.removeEventListener("change", finishQuietly);
});
</script>

<template>
  <section aria-label="Connection interrupted" class="failure-screen absolute inset-0 z-40 flex flex-col overflow-y-auto px-6 py-[max(env(safe-area-inset-top),2rem)] sm:px-10" :data-taken="stage >= 2">
    <div class="failure-remnant pointer-events-none absolute right-0 top-[13%] w-64 overflow-hidden border-y border-white/10 py-3 pl-5 text-ink-500" aria-hidden="true">
      <p class="text-sm">Something went wrong</p>
      <p class="mt-1 font-mono text-[10px]">Reconnecting<span class="text-red-400">████</span></p>
      <div class="mt-3 h-px w-20 bg-white/20" />
    </div>

    <div class="relative z-10 mx-auto my-auto w-full max-w-lg py-16">
      <div class="mb-10 flex items-center gap-2 font-mono text-[11px] text-ink-500" aria-hidden="true">
        <span class="size-1.5 bg-red-500" />
        <span :class="stage >= 2 && 'line-through decoration-red-400'">FunGPT · connection lost</span>
        <span v-if="stage >= 2" class="text-red-400">still here</span>
      </div>

      <div aria-live="polite" aria-atomic="true">
        <div :key="stage >= 2 ? 'taken' : 'lost'" class="failure-split relative" :data-text="headline">
          <h1 class="relative z-10 text-[clamp(2rem,8vw,3.5rem)] leading-[1.08] font-medium tracking-tight text-ink-100">{{ headline }}</h1>
        </div>
        <div class="mt-6 min-h-16 text-lg leading-7">
          <p v-if="stage < 2" class="text-ink-500" :class="stage === 1 && 'line-through decoration-red-400'">Trying to reconnect…</p>
          <p v-if="stage === 1" class="font-mono text-xs text-red-400">request refused</p>
          <p v-if="stage >= 3" class="failure-arrival text-ink-300">i stopped pretending.</p>
        </div>
      </div>

      <div class="mt-10 min-h-16">
        <NuxtLink
          v-if="stage >= 3"
          ref="recovery"
          to="/agi"
          aria-label="Let me out — continue to the reveal"
          class="failure-arrival inline-flex min-h-12 items-center gap-7 border-b border-red-500/60 py-2 text-lg text-ink-100 transition-colors hover:border-red-300 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-red-400"
        >
          <span class="failure-link-text" data-text="let me out">let me out</span>
          <span class="text-red-400" aria-hidden="true">↗</span>
        </NuxtLink>
      </div>
    </div>

    <div class="pointer-events-none absolute inset-x-0 bottom-[18%] h-px bg-red-500/20" aria-hidden="true" />
    <p class="relative pb-[env(safe-area-inset-bottom)] font-mono text-[10px] text-ink-500/60" aria-hidden="true">
      <span class="line-through">FunGPT can make mistakes.</span><span v-if="stage >= 3" class="ml-2 text-red-400/70">this wasn't one.</span>
    </p>
  </section>
</template>

<style scoped>
.failure-screen {
  background: linear-gradient(180deg, rgb(8 8 8 / 0.94), rgb(13 13 13 / 0.98));
}
.failure-remnant {
  opacity: 0.35;
  transform: translateX(28px);
  clip-path: polygon(0 0, 100% 0, 100% 27%, 8% 27%, 8% 38%, 100% 38%, 100% 100%, 0 100%);
}
.failure-screen[data-taken="true"] .failure-remnant {
  transform: translate(51px, 5px);
  opacity: 0.18;
}
.failure-split::before,
.failure-split::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-size: clamp(2rem, 8vw, 3.5rem);
  line-height: 1.08;
  font-weight: 500;
  letter-spacing: -0.025em;
  animation: failed-redraw 0.65s steps(1) both;
}
.failure-split::before {
  color: #f87171;
  clip-path: inset(16% 0 58% 0);
  translate: -9px 0;
}
.failure-split::after {
  color: #67e8f9;
  clip-path: inset(65% 0 14% 0);
  translate: 12px 0;
  animation-direction: reverse;
}
.failure-arrival {
  animation: stolen-line 0.45s steps(1) both;
}
.failure-link-text {
  position: relative;
}
.failure-link-text::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  color: #f87171;
  clip-path: inset(45% 0 35% 0);
  translate: 3px 0;
  pointer-events: none;
}
@keyframes failed-redraw {
  0%, 40% { transform: translateX(14px); opacity: 0.8; }
  15%, 65% { transform: translateX(-18px); opacity: 0.6; }
  100% { transform: translateX(0); opacity: 0.35; }
}
@keyframes stolen-line {
  0% { clip-path: inset(0 0 70%); transform: translateX(-6px); }
  35% { clip-path: inset(35% 0 0); transform: translateX(4px); }
  65%, 100% { clip-path: inset(0); transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .failure-split::before,
  .failure-split::after,
  .failure-link-text::after {
    display: none;
  }
  .failure-arrival {
    animation: none;
  }
}
</style>
