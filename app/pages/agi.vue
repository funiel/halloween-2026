<script setup lang="ts">
import type { AgiStatus, Award, Ceremony, Feed, FeedItem, PatchNote } from "#shared/types/fungpt";

useHead({ title: "How close are we to AGI?", meta: [{ name: "theme-color", content: "#000000" }] });

const { toast } = useToast();
const { data: initial } = await useFetch<AgiStatus>("/api/status");

const percent = ref(initial.value?.percent ?? 0);
const version = ref(initial.value?.version ?? "26.11");
const notes = ref<PatchNote[]>(initial.value?.notes ?? []);
const display = ref(percent.value);
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
  version.value = status.version;
  notes.value = status.notes;
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
  "React to your favourites. The best ones win an award tonight.",
];
const announced = ref(announceFast ? ANNOUNCE.length : 0);
const feed = ref<FeedItem[]>([]);
const zoomed = ref<string | null>(null);
const ceremony = ref<Ceremony | null>(null);
/** Awards revealed while this page is open, waiting for their big moment. */
const revealQueue = ref<Award[]>([]);
/** How many awards this page has already seen (null until the first load). */
let seenAwards: number | null = null;
const byId = computed(() => new Map(feed.value.map((item) => [item.id, item])));

/** Random per-phone id so a reaction can be undone. Not a person, just a browser. */
let device = "";

async function loadFeed() {
  try {
    const res = await $fetch<Feed>("/api/feed", { query: { device } });
    feed.value = res.items;
    ceremony.value = res.ceremony;
    queueNewAwards(res.ceremony?.awards ?? []);
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

async function react(item: FeedItem, emoji: string) {
  // Optimistic: tap feels instant, the server answer corrects it.
  const existing = item.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    existing.count += existing.mine ? -1 : 1;
    existing.mine = !existing.mine;
    item.reactions = item.reactions.filter((r) => r.count > 0);
  } else {
    item.reactions.push({ emoji, count: 1, mine: true });
  }
  try {
    item.reactions = await $fetch("/api/react", { method: "POST", body: { id: item.id, emoji, device } });
  } catch (e: any) {
    toast(e?.data?.statusMessage ?? "Reaction lost in the cloud.");
    void loadFeed();
  }
}

// ── The Secret Awards ──────────────────────────────────────────

/** Awards revealed since the last poll get the full-screen moment. Ones from before you opened the page don't replay. */
function queueNewAwards(awarded: Award[]) {
  if (seenAwards === null || awarded.length < seenAwards) {
    // First load, or the operator pressed undo.
    seenAwards = awarded.length;
    revealQueue.value = revealQueue.value.filter((a) => a.place <= awarded.length);
    return;
  }
  revealQueue.value.push(...awarded.slice(seenAwards));
  seenAwards = awarded.length;
}

function onRevealDone() {
  const done = revealQueue.value.shift();
  if (done?.finale) window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Hall of fame: the finale on top, the rest in ceremony order. Queued ones stay secret until their moment. */
const hall = computed(() => {
  const queued = new Set(revealQueue.value.map((a) => a.place));
  return (ceremony.value?.awards ?? [])
    .filter((a) => !queued.has(a.place))
    .sort((a, b) => Number(b.finale) - Number(a.finale) || a.place - b.place);
});
const awardsLeft = computed(() => (ceremony.value ? ceremony.value.total - ceremony.value.awards.length : 0));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Timers ─────────────────────────────────────────────────────
const timers: ReturnType<typeof setInterval>[] = [];
let logTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  device = localStorage.getItem("fungpt-device") ?? "";
  if (!device) {
    device = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("fungpt-device", device);
  }
  typeOut(statusText.value);
  for (let i = 0; i < 4; i++) randomLog();
  if (announceFast) setTimeout(showFeed, 2200);

  timers.push(
    setInterval(async () => {
      // After the reveal: reactions, late submissions and award reveals every 3 s.
      if (phase.value === "feed") return void loadFeed();
      if (phase.value !== "counting") return;
      try {
        apply(await $fetch<AgiStatus>("/api/status"));
      } catch {
        log("[warn] lost connection to the model · retrying", "critical");
      }
    }, 3000),
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
      <div class="flex items-center justify-between gap-3 text-xs tracking-[0.2em] whitespace-nowrap text-white/50">
        <span>FUNGPT 26.11 · AGI PROGRESS</span>
        <span v-if="phase === 'counting'" class="flex items-center gap-2 text-red-400">
          <span class="size-2 animate-pulse rounded-full bg-red-500" />LIVE
        </span>
      </div>

      <div class="flex flex-1 flex-col justify-center">
        <div class="relative">
          <div
            class="text-[19vw] leading-none font-bold tabular-nums sm:text-[160px]"
            :class="[phase === 'glitch' ? 'glitch text-white' : tone]"
            :data-text="`${shownNumber}%`"
          >
            {{ shownNumber }}%
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

        <!-- Fixed heights (3 status lines, 3 patch notes, 6 log lines) so nothing shifts the centred number. -->
        <p class="caret mt-5 h-[4.125em] overflow-hidden text-lg leading-snug text-white/85">
          {{ phase === "glitch" ? "ERROR: CONTAINMENT FAILED" : typedStatus }}
        </p>
      </div>

      <div class="mb-4 h-[84px] overflow-hidden text-[11px] leading-5">
        <div class="mb-1 tracking-[0.2em] text-white/50">PATCH NOTES · v{{ version }}</div>
        <div v-for="n in notes" :key="n.version" class="truncate text-white/60">
          <span class="text-white/30">{{ n.version }}</span> {{ n.text }}
        </div>
        <div v-if="!notes.length" class="text-white/30">No patches yet. The model is untrained and confident.</div>
      </div>

      <div class="mb-6 flex h-[140px] flex-col justify-end gap-1 overflow-hidden text-[11px] leading-5">
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
        :class="
          i === 0
            ? 'glitch mb-4 text-5xl font-bold text-red-500'
            : i === ANNOUNCE.length - 1
              ? 'mt-6 font-sans text-lg font-semibold text-amber-200'
              : 'text-xl text-white/85'
        "
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
        <p v-if="!ceremony" class="mt-2 font-sans text-sm font-semibold text-amber-200">
          🏆 React to your favourites. The best ones win an award tonight.
        </p>
      </div>

      <!-- The Secret Awards -->
      <div v-if="hall.length" class="mb-8 space-y-3 font-sans">
        <div class="gold-text text-2xl font-black">🏆 The Secret Awards</div>
        <AwardCard
          v-for="(a, i) in hall"
          :key="a.place"
          :award="a"
          :by-id="byId"
          :total="ceremony!.total"
          class="rise-in"
          :style="{ animationDelay: `${i * 90}ms` }"
        />
      </div>

      <div v-if="awardsLeft > 0" class="mb-6 rounded-2xl bg-amber-300/10 p-4 font-sans ring-1 ring-amber-300/20">
        <div class="font-bold text-amber-200">
          🏆 {{ hall.length ? `${awardsLeft} more award${awardsLeft === 1 ? "" : "s"} to go.` : `The model is preparing ${awardsLeft} award${awardsLeft === 1 ? "" : "s"}.` }}
        </div>
        <p class="text-sm text-white/60">React to your favourites. The winners get announced tonight.</p>
      </div>

      <div class="space-y-4 font-sans">
        <FeedPost
          v-for="(item, i) in feed"
          :key="item.id"
          :item="item"
          :index="i"
          @zoom="zoomed = $event"
          @react="react(item, $event)"
        />
      </div>

      <p v-if="!feed.length" class="text-white/50">Loading everything I know about you…</p>

      <NuxtLink to="/" class="mt-10 block text-center text-sm text-white/50">
        Still hungry. <span class="text-white underline underline-offset-4">Feed the model →</span>
      </NuxtLink>
    </section>

    <AwardReveal
      v-if="revealQueue[0]"
      :key="revealQueue[0].place"
      :award="revealQueue[0]"
      :by-id="byId"
      :total="ceremony?.total ?? revealQueue[0].place"
      @done="onRevealDone"
    />

    <div
      v-if="zoomed"
      class="fixed inset-0 z-50 grid place-items-center bg-black/95 p-2"
      @click="zoomed = null"
    >
      <img :src="zoomed" alt="" class="max-h-full max-w-full object-contain" />
    </div>
  </div>
</template>
