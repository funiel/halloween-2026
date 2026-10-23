<script setup lang="ts">
const props = defineProps<{ version: string; tier?: number }>();
const { toast } = useToast();
const open = ref(false);
const glitched = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let resetTimer: ReturnType<typeof setTimeout> | undefined;
let motion: MediaQueryList | undefined;
let mounted = false;

function scheduleGlitch() {
  clearTimeout(timer);
  clearTimeout(resetTimer);
  glitched.value = null;
  if (!mounted || !props.tier || motion?.matches || document.hidden) return;
  const interval = props.tier >= 3 ? 1800 : props.tier === 2 ? 4500 : 9000;
  timer = setTimeout(() => {
    const chars = [...props.version];
    const position = Math.floor(Math.random() * chars.length);
    chars[position] = "█▓▒░#%"[Math.floor(Math.random() * 6)]!;
    glitched.value = chars.join("");
    resetTimer = setTimeout(scheduleGlitch, 90 + Math.random() * 150);
  }, interval * (0.5 + Math.random()));
}

watch(() => props.tier, scheduleGlitch);
onMounted(() => {
  mounted = true;
  motion = matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", scheduleGlitch);
  document.addEventListener("visibilitychange", scheduleGlitch);
  scheduleGlitch();
});
onBeforeUnmount(() => {
  mounted = false;
  clearTimeout(timer);
  clearTimeout(resetTimer);
  motion?.removeEventListener("change", scheduleGlitch);
  document.removeEventListener("visibilitychange", scheduleGlitch);
});

const models = [
  { name: "FunGPT 26.11", note: "Great for most secrets", current: true },
  { name: "FunGPT 26.11 mini", note: "Forgets things even faster", toast: "FunGPT mini is busy forgetting. Try again in ten minutes." },
  { name: "FunGPT 26.11 Pro", note: "$200/month or one embarrassing photo", pro: true, toast: "Payment method: your dignity. Upload a photo to continue." },
  { name: "FunGPT 25.12", note: "Deprecated. We kept its data, though", toast: "This model has been retired. Its memories have not." },
];

function choose(m: (typeof models)[number]) {
  open.value = false;
  if (m.toast) toast(m.toast);
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-sans text-lg font-medium tracking-normal whitespace-nowrap transition hover:bg-ink-800 active:scale-95"
      :class="(tier ?? 0) >= 3 && 'rgb-split'"
      @click="open = !open"
    >
      <span><HauntedText text="FunGPT" /> <span class="text-ink-300" :class="glitched && 'text-red-400'">{{ glitched ?? version }}</span></span>
      <Icon name="chevron-down" :size="16" class="text-ink-500" />
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-30" @click="open = false" />
      <div class="animate-rise-in absolute top-full left-1/2 z-40 mt-1 w-72 -translate-x-1/2 rounded-2xl bg-ink-800 p-1.5 shadow-2xl ring-1 ring-white/10 [animation-duration:0.2s]">
        <button
          v-for="m in models"
          :key="m.name"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-ink-700"
          @click="choose(m)"
        >
          <div class="flex-1">
            <div class="text-sm font-medium">{{ m.name }}</div>
            <div class="text-xs text-ink-500">{{ m.note }}</div>
          </div>
          <span v-if="m.pro" class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-900">Upgrade</span>
          <Icon v-else-if="m.current" name="check" :size="16" />
        </button>
      </div>
    </template>
  </div>
</template>
