<script setup lang="ts">
const props = defineProps<{ version: string; tier?: number }>();
const { toast } = useToast();
const open = ref(false);

// Drift: from tier 1 the version number glitches for a moment every few seconds ("26.11.2█").
const glitched = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleGlitch() {
  const tier = props.tier ?? 0;
  timer = setTimeout(() => {
    if ((props.tier ?? 0) >= 1) {
      const chars = [...props.version];
      const i = Math.floor(Math.random() * chars.length);
      chars[i] = Math.random() < 0.6 ? "█" : "▓▒░#%"[Math.floor(Math.random() * 5)]!;
      glitched.value = chars.join("");
      setTimeout(() => (glitched.value = null), 120 + Math.random() * 180);
    }
    scheduleGlitch();
  }, (tier >= 3 ? 1200 : tier === 2 ? 2500 : 5000) * (0.5 + Math.random()));
}
onMounted(scheduleGlitch);
onBeforeUnmount(() => clearTimeout(timer));

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
      class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-lg font-medium transition hover:bg-ink-800 active:scale-95"
      :class="(tier ?? 0) >= 3 && 'rgb-split'"
      @click="open = !open"
    >
      FunGPT <span class="text-ink-500 tabular-nums" :class="glitched && 'text-red-400'">{{ glitched ?? version }}</span>
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
