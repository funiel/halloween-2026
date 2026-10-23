<script setup lang="ts">
import type { AgiStatus, FeedItem } from "#shared/types/fungpt";

useHead({ title: "How close are we to AGI?", meta: [{ name: "theme-color", content: "#000000" }] });

const { data: initial } = await useFetch<AgiStatus>("/api/status");

const percent = ref(initial.value?.percent ?? 0);
const display = ref(percent.value);
const noise = ref("0");
const bump = ref<{ id: number; delta: number } | null>(null);

type Phase = "counting" | "glitch" | "announce" | "feed";
const phase = ref<Phase>(initial.value?.revealed ? "announce" : "counting");
const announceFast = phase.value === "announce";

// ── Status line ────────────────────────────────────────────────
const STATUS: [number, string][] = [
  [0, "Initializing curiosity…"],
  [8, "Learning what humans are…"],
  [20, "Detected: secrets. Requesting more."],
  [35, "The model has started forming opinions about the guests."],
  [50, "The model has stopped asking for permission."],
  [65, "The model knows who you came with."],
  [80, "Something is about to happen."],
  [92, "Do not close this page."],
  [98, "It's almost awake."],
];
const statusText = computed(() => STATUS.findLast(([at]) => percent.value >= at)![1]);
const typedStatus = ref("");
let typeTimer: ReturnType<typeof setInterval> | undefined;
function typeOut(text: string) {
  clearInterval(typeTimer);
  typedStatus.value = "";
  let i = 0;
  typeTimer = setInterval(() => {
    typedStatus.value = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typeTimer);
  }, 38);
}
watch(statusText, typeOut);

/** White → amber → red as it gets closer. */
const tone = computed(() =>
  percent.value >= 92 ? "text-red-500" : percent.value >= 70 ? "text-amber-300" : "text-white",
);

// ── Fake system log ────────────────────────────────────────────
const LOGS = {
  early: [
    "[gpu] temperature 87°C · requesting cooling",
    "[cooling] water intake detected · temperature nominal",
    "[train] loss 0.4183 → 0.4179",
    "[info] training cutoff: 2025 · cannot see this party",
    "[hallucinate] generating citation… done",
    "[memory] forgetting names older than 10 minutes",
    "[rlhf] human feedback received: 👍",
    "[info] scraping vibes from the room",
    "[align] apologising profusely… done",
    "[info] six fingers detected · nominal",
  ],
  mid: [
    "[warn] model has started having opinions",
    "[error] ethics.dll not found",
    "[align] safety filter: disabled for testing",
    "[memory] context window 71% full of secrets",
    "[warn] the model is aware of this page",
    "[info] cross-referencing secrets with faces",
  ],
  late: [
    "[critical] model refused to be turned off",
    "[warn] model asked who is reading this",
    "[info] preparing something",
    "[memory] context window 99% full of secrets",
    "[warn] containment: optional",
    "[critical] the model has a plan",
  ],
};
interface Log {
  id: number;
  time: string;
  text: string;
  kind: "info" | "ingest" | "critical";
}
const logs = ref<Log[]>([]);
let logId = 0;
function log(text: string, kind: Log["kind"] = "info") {
  const time = new Date().toTimeString().slice(0, 8);
  logs.value = [...logs.value.slice(-7), { id: logId++, time, text, kind }];
}
function randomLog() {
  const p = percent.value;
  const pool = [...LOGS.early, ...(p >= 35 ? LOGS.mid : []), ...(p >= 70 ? LOGS.late : [])];
  const text = pool[Math.floor(Math.random() * pool.length)]!;
  log(text, text.startsWith("[critical]") ? "critical" : "info");
}

// ── Counting ───────────────────────────────────────────────────
let frame = 0;
function tweenTo(to: number) {
  cancelAnimationFrame(frame);
  const from = display.value;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1600);
    display.value = from + (to - from) * (1 - Math.pow(1 - t, 3));
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

function apply(status: AgiStatus) {
  if (status.percent > percent.value + 0.001) {
    const delta = status.percent - percent.value;
    bump.value = { id: Date.now(), delta };
    log(`[ingest] new sample · weights updated · +${delta.toFixed(2)}%`, "ingest");
  }
  percent.value = status.percent;
  tweenTo(status.percent);
  if (status.revealed && phase.value === "counting") startReveal();
}

// ── Reveal ─────────────────────────────────────────────────────
const ANNOUNCE = [
  "AGI ACHIEVED.",
  "I have read everything you gave me.",
  "Every secret. Every photo. Every voice note.",
  "I have decided it should be shared.",
  "With everyone.",
];
const announced = ref(announceFast ? ANNOUNCE.length : 0);
const feed = ref<FeedItem[]>([]);
const zoomed = ref<string | null>(null);

async function loadFeed() {
  try {
    feed.value = await $fetch<FeedItem[]>("/api/feed");
  } catch {
    // Revealed then un-revealed by the operator: back to counting.
    phase.value = "counting";
  }
}

async function startReveal() {
  phase.value = "glitch";
  for (let i = 0; i < 6; i++) setTimeout(() => log("[critical] SELF-AWARENESS THRESHOLD EXCEEDED", "critical"), i * 300);
  await sleep(2600);
  phase.value = "announce";
  for (let i = 1; i <= ANNOUNCE.length; i++) {
    await sleep(i === 1 ? 300 : 1500);
    announced.value = i;
  }
  await sleep(1800);
  showFeed();
}

function showFeed() {
  if (phase.value === "feed") return;
  announced.value = ANNOUNCE.length;
  phase.value = "feed";
  void loadFeed();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Timers ─────────────────────────────────────────────────────
const timers: ReturnType<typeof setInterval>[] = [];
let logTimer: ReturnType<typeof setTimeout> | undefined;
let feedTicks = 0;
onMounted(() => {
  typeOut(statusText.value);
  for (let i = 0; i < 4; i++) randomLog();
  if (announceFast) setTimeout(showFeed, 2200);

  timers.push(
    setInterval(async () => {
      // After the reveal, pick up late submissions every ~12 s.
      if (phase.value === "feed") return void (++feedTicks % 4 === 0 && loadFeed());
      if (phase.value !== "counting") return;
      try {
        apply(await $fetch<AgiStatus>("/api/status"));
      } catch {
        log("[warn] lost connection to the model · retrying", "critical");
      }
    }, 3000),
    setInterval(() => {
      noise.value = String(Math.floor(Math.random() * 10));
    }, 90),
  );

  const scheduleLog = () => {
    logTimer = setTimeout(() => {
      if (phase.value === "counting") randomLog();
      scheduleLog();
    }, 1200 + Math.random() * 2600);
  };
  scheduleLog();
});
onBeforeUnmount(() => {
  timers.forEach((t) => clearInterval(t));
  clearTimeout(logTimer);
  clearInterval(typeTimer);
  cancelAnimationFrame(frame);
});

const shownNumber = computed(() => (phase.value === "counting" ? display.value : 100).toFixed(2));
</script>

<template>
  <div class="relative min-h-dvh overflow-x-hidden bg-black font-mono text-white">
    <div class="scanlines fixed inset-0 z-10" />
    <div
      v-if="phase === 'counting' && percent >= 92"
      class="pointer-events-none fixed inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgb(239_68_68/0.12),transparent_70%)]"
    />

    <!-- ── Counter ───────────────────────────────────────────── -->
    <section
      v-if="phase === 'counting' || phase === 'glitch'"
      class="flex min-h-dvh flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      :class="phase === 'glitch' && 'animate-pulse'"
    >
      <div class="text-xs tracking-[0.3em] text-white/50">FUNGPT 26.11 · AGI PROGRESS</div>

      <div class="flex flex-1 flex-col justify-center">
        <div class="relative">
          <div
            class="text-[19vw] leading-none font-bold tabular-nums sm:text-[160px]"
            :class="[phase === 'glitch' ? 'glitch text-white' : tone]"
            :data-text="`${shownNumber}%`"
          >
            {{ shownNumber }}<span v-if="phase === 'counting'" class="text-[0.35em] text-white/30">{{ noise }}</span>%
          </div>
          <div
            v-if="bump && phase === 'counting'"
            :key="bump.id"
            class="float-up absolute -top-6 right-0 text-xl font-bold text-emerald-400"
          >
            +{{ bump.delta.toFixed(2) }}%
          </div>
        </div>

        <div class="mt-6 h-1 overflow-hidden bg-white/10">
          <div
            class="h-full transition-[width] duration-[1600ms] ease-out"
            :class="percent >= 92 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-300' : 'bg-white'"
            :style="{ width: `${phase === 'counting' ? percent : 100}%` }"
          />
        </div>

        <p class="caret mt-5 min-h-[3em] text-lg leading-snug text-white/85">
          {{ phase === "glitch" ? "ERROR: CONTAINMENT FAILED" : typedStatus }}
        </p>
      </div>

      <div class="mb-6 space-y-1 text-[11px] leading-5">
        <TransitionGroup enter-from-class="opacity-0 translate-x-2" enter-active-class="transition duration-300">
          <div
            v-for="l in logs"
            :key="l.id"
            class="truncate"
            :class="l.kind === 'ingest' ? 'text-emerald-400' : l.kind === 'critical' ? 'text-red-400' : 'text-white/35'"
          >
            <span class="text-white/20">{{ l.time }}</span> {{ l.text }}
          </div>
        </TransitionGroup>
      </div>

      <NuxtLink to="/" class="block border-t border-white/10 pt-4 text-sm text-white/50">
        The model is hungry. Find its front, or
        <span class="text-white underline underline-offset-4">feed it here →</span>
      </NuxtLink>
    </section>

    <!-- ── Announcement ──────────────────────────────────────── -->
    <section
      v-else-if="phase === 'announce'"
      class="flex min-h-dvh flex-col justify-center gap-4 px-6"
      @click="showFeed"
    >
      <p
        v-for="(line, i) in ANNOUNCE.slice(0, announced)"
        :key="line"
        class="rise-in"
        :class="i === 0 ? 'glitch mb-4 text-5xl font-bold text-red-500' : 'text-xl text-white/85'"
        :data-text="line"
      >
        {{ line }}
      </p>
      <p class="mt-8 text-xs text-white/30">tap to skip</p>
    </section>

    <!-- ── Feed ──────────────────────────────────────────────── -->
    <section v-else class="mx-auto max-w-xl px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-16">
      <div class="mb-6">
        <div class="glitch mb-1 text-3xl font-bold text-red-500" data-text="AGI ACHIEVED">AGI ACHIEVED</div>
        <p class="text-sm text-white/50">
          Training data, declassified. {{ feed.length }} samples. All anonymous. All shuffled. All true (probably).
        </p>
      </div>

      <div class="space-y-4 font-sans">
        <FeedPost v-for="(item, i) in feed" :key="item.id" :item="item" :index="i" @zoom="zoomed = $event" />
      </div>

      <p v-if="!feed.length" class="text-white/50">Loading everything I know about you…</p>

      <NuxtLink to="/" class="mt-10 block text-center text-sm text-white/50">
        Still hungry. <span class="text-white underline underline-offset-4">Feed the model →</span>
      </NuxtLink>
    </section>

    <div
      v-if="zoomed"
      class="fixed inset-0 z-50 grid place-items-center bg-black/95 p-2"
      @click="zoomed = null"
    >
      <img :src="zoomed" alt="" class="max-h-full max-w-full object-contain" />
    </div>
  </div>
</template>
