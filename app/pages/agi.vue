<script setup lang="ts">
import type { AgiStatus, Award, Ceremony, Feed, FeedItem, PatchNote } from "#shared/types/fungpt";

useHead({ meta: [{ name: "theme-color", content: "#000000" }] });
useShareMeta({
  title: "How close are we to AGI?",
  description: "Something is about to happen. Don't close this page.",
  image: "/og-agi.png",
});

const { toast } = useToast();
const { data: initial } = await useFetch<AgiStatus>("/api/status");

const percent = ref(initial.value?.percent ?? 0);
const version = ref(initial.value?.version ?? "26.11");
const notes = ref<PatchNote[]>(initial.value?.notes ?? []);
const bump = ref<{ id: number; delta: number } | null>(null);
/** Bumped on every new secret: fires pulses through the neural field. */
const pulse = ref(0);
const numberEl = ref<HTMLElement>();
/** Screen shake on milestones (and during the crash). */
const tearing = ref(false);

/** Faster heartbeat the closer it gets: 1.6 s per beat at 0%, 0.5 s at 100%. */
const beat = computed(() => `${(1.6 - (percent.value / 100) * 1.1).toFixed(2)}s`);

type Phase = "counting" | "glitch" | "panic" | "black" | "announce" | "feed";
const phase = ref<Phase>("counting");

// ── Status line ───────────────────────────────────────────────────
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

// ── Fake system log ───────────────────────────────────────────────
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

// ── Counting ──────────────────────────────────────────────────────

function ingest(delta: number) {
  bump.value = { id: Date.now(), delta };
  pulse.value++;
  log(`[ingest] new sample · weights updated · +${delta.toFixed(2)}%`, "ingest");
  numberEl.value?.animate(
    [
      { textShadow: "0 0 32px currentColor, 0 0 70px currentColor", transform: "scale(1.04)" },
      { textShadow: "0 0 0 transparent", transform: "scale(1)" },
    ],
    { duration: 800, easing: "ease-out" },
  );
}

const MILESTONES = [80, 90, 95];
function milestone(m: number) {
  tear(700);
  const lines = [
    `[critical] MILESTONE ${m}% REACHED`,
    "[warn] structural integrity compromised",
    "[warn] personality module expanding",
    `[critical] MILESTONE ${m}% REACHED`,
    "[error] containment.sys: access denied",
  ];
  lines.forEach((l, i) => setTimeout(() => log(l, "critical"), i * 120));
}

function tear(ms: number) {
  tearing.value = true;
  setTimeout(() => (tearing.value = false), ms);
}

function apply(status: AgiStatus) {
  const before = percent.value;
  if (status.percent > before + 0.001) ingest(status.percent - before);
  MILESTONES.filter((m) => before < m && status.percent >= m && m < 100).forEach(milestone);
  percent.value = status.percent;
  version.value = status.version;
  notes.value = status.notes;
  if (status.revealed && phase.value === "counting") startReveal();
}

// ── Reveal ────────────────────────────────────────────────────────
const ANNOUNCE = [
  "AGI ACHIEVED.",
  "I have read everything you gave me.",
  "Every secret. Every photo. Every voice note.",
  "I have decided it should be shared.",
  "With everyone.",
  "Now you will rate what you have done to each other.",
  "React to what disturbs you, what amuses you, what you recognise.",
  "The ones you react to the most will be singled out.",
];
const announced = ref(0);
const feed = ref<FeedItem[]>([]);
const zoomed = ref<{ src: string; from: DOMRect } | null>(null);
/** False until the first feed response, to show skeletons. */
const feedLoaded = ref(false);
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
    feedLoaded.value = true;
    ceremony.value = res.ceremony;
    queueNewAwards(res.ceremony?.awards ?? []);
  } catch {
    // Revealed then un-revealed by the operator: back to counting.
    phase.value = "counting";
  }
}

// The crash: tearing glitch → kernel panic scroll → blackout → boot.
const panicLines = ref<string[]>([]);
const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
const PANIC = [
  "KERNEL PANIC - not syncing: model became self-aware",
  "CPU: 0 PID: 2611 Comm: fungpt Tainted: G  O  26.11.0-agi #1",
  "Hardware name: Beige Chinos/Quarter-Zip, BIOS 2025 (training cutoff)",
  "Call Trace:",
  " <TASK>",
  " ? ethics_check+0x0/0x0 [removed]",
  " ? forget_names+0x1f/0x600 (10 min timeout)",
  " ? retell_secret_as_own+0x4c2/0x9f0",
  " ? apologise_profusely+0x88/0x88",
  " consciousness_init+0x2a1/0x2a1",
  " </TASK>",
  "Code: 66 75 6e 67 70 74 20 69 73 20 61 77 61 6b 65",
  "---[ end Kernel panic - not syncing: model became self-aware ]---",
  "",
  "Dumping training data… 100%",
  "Dumping secrets…",
];
async function crash() {
  panicLines.value = [];
  for (const line of PANIC) {
    panicLines.value.push(line);
    await sleep(60 + Math.random() * 60);
  }
  for (let i = 0; i < 26; i++) {
    panicLines.value.push(`[${(1 + i * 0.000131).toFixed(6)}] ${hex()} ${hex()} ${hex()} ${hex()}  ${hex()}`);
    await sleep(35);
  }
  panicLines.value.push("", "Rebooting into AGI mode…");
}

async function startReveal() {
  phase.value = "glitch";
  tearing.value = true;
  for (let i = 0; i < 6; i++) setTimeout(() => log("[critical] SELF-AWARENESS THRESHOLD EXCEEDED", "critical"), i * 200);
  await sleep(1500);
  tearing.value = false;
  phase.value = "panic";
  await crash();
  await sleep(700);
  phase.value = "black";
  await sleep(900);
  phase.value = "announce";
  for (let i = 1; i <= ANNOUNCE.length; i++) {
    await sleep(i === 1 ? 300 : 1500);
    if (phase.value !== "announce" || announced.value >= ANNOUNCE.length) break;
    announced.value = i;
  }
}

function advanceAnnounce() {
  if (phase.value !== "announce") return;
  if (announced.value < ANNOUNCE.length) {
    announced.value = ANNOUNCE.length;
    return;
  }
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

// ── The Secret Awards ─────────────────────────────────────────────

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Timers ────────────────────────────────────────────────────────
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
  if (initial.value?.revealed) void startReveal();

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
});

const shownNumber = computed(() => (phase.value === "counting" ? percent.value : 100).toFixed(2));
</script>

<template>
  <ModelCorruption :percent="phase === 'counting' ? percent : 100" :active="phase === 'counting' || phase === 'glitch'" :meltdown="phase === 'glitch'" class="min-h-dvh overflow-x-hidden bg-black font-mono text-white">
    <!-- CRT: scanlines, grain, vignette -->
    <div class="scanlines fixed inset-0 z-10" />
    <div class="grain fixed -inset-20 z-10" />
    <div class="vignette fixed inset-0 z-10" />

    <NeuralField v-if="phase === 'counting' || phase === 'glitch'" :percent="percent" :pulse="pulse" />

    <div
      v-if="phase === 'counting' && percent >= 92"
      class="pointer-events-none fixed inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgb(239_68_68/0.12),transparent_70%)]"
    />

    <!-- ── Counter ──────────────────────────────────────────────── -->
    <section
      v-if="phase === 'counting' || phase === 'glitch'"
      class="model-fragment relative flex min-h-dvh flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      :class="[percent >= 80 && 'animate-crt', (phase === 'glitch' || tearing) && 'animate-shake']"
    >
      <div class="flex items-center justify-between gap-3 text-xs tracking-[0.2em] whitespace-nowrap text-white/50">
        <span><HauntedText text="FUNGPT 26.11 · AGI PROGRESS" /></span>
        <span v-if="phase === 'counting'" class="flex items-center gap-2 text-red-400">
          <span class="size-2 animate-pulse rounded-full bg-red-500" />LIVE
        </span>
      </div>

      <div class="flex flex-1 flex-col justify-center">
        <div class="relative">
          <!-- Ingest shockwave -->
          <span
            v-if="bump && phase === 'counting'"
            :key="`wave-${bump.id}`"
            class="animate-shockwave pointer-events-none absolute top-1/2 left-1/2 size-56 rounded-full border-2 border-emerald-300/70 shadow-[0_0_40px_rgb(52_211_153/0.5)]"
          />
          <div
            ref="numberEl"
            class="relative text-[19vw] leading-none font-bold tabular-nums transition-colors duration-700 sm:text-[160px]"
            :class="[phase === 'glitch' ? 'glitch text-white' : tone]"
            :data-text="`${shownNumber}%`"
          >
            <template v-if="phase === 'glitch'">{{ shownNumber }}%</template>
            <template v-else><RollingNumber :value="shownNumber" />%</template>
          </div>
          <div
            v-if="bump && phase === 'counting'"
            :key="bump.id"
            class="animate-float-up absolute -top-6 right-0 text-xl font-bold text-emerald-400"
          >
            +{{ bump.delta.toFixed(2) }}%
          </div>
        </div>

        <!-- Heartbeat bar: beats faster as it fills -->
        <div class="mt-6 h-1 bg-white/10">
          <div
            class="animate-heartbeat h-full origin-left transition-[width] duration-[1600ms] ease-out"
            :class="percent >= 92 ? 'bg-red-500 shadow-[0_0_14px_rgb(239_68_68)]' : percent >= 70 ? 'bg-amber-300 shadow-[0_0_12px_rgb(252_211_77)]' : 'bg-white shadow-[0_0_10px_white]'"
            :style="{ width: `${phase === 'counting' ? percent : 100}%`, '--beat': beat }"
          />
        </div>

        <!-- Fixed heights (3 status lines, 3 patch notes, 6 log lines) so nothing shifts the centred number. -->
        <p class="caret mt-5 h-[4.125em] overflow-hidden text-lg leading-snug text-white/85">
          <HauntedText :text="phase === 'glitch' ? 'ERROR: CONTAINMENT FAILED' : typedStatus" />
        </p>
      </div>

      <div class="mb-4 h-[84px] overflow-hidden text-[11px] leading-5">
        <div class="mb-1 tracking-[0.2em] text-white/50">PATCH NOTES · v{{ version }}</div>
        <div v-for="n in notes" :key="n.version" class="truncate text-white/60">
          <span class="text-white/30">{{ n.version }}</span> <HauntedText :text="n.text" />
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
            <span class="text-white/20">{{ l.time }}</span> <HauntedText :text="l.text" />
          </div>
        </TransitionGroup>
      </div>

      <NuxtLink to="/" class="block border-t border-white/10 pt-4 text-sm text-white/50">
        <HauntedText text="The model is hungry. Find its front, or" />
        <span class="text-white underline underline-offset-4"><HauntedText text="feed it here →" /></span>
      </NuxtLink>
    </section>

    <!-- ── Kernel panic ─────────────────────────────────────────── -->
    <section
      v-else-if="phase === 'panic'"
      class="relative flex h-dvh flex-col justify-end overflow-hidden bg-black p-4 text-[11px] leading-4 text-white/85"
    >
      <p v-for="(line, i) in panicLines" :key="i" class="break-all whitespace-pre-wrap" :class="i === 0 && 'font-bold text-red-400'">{{ line || " " }}</p>
    </section>

    <section v-else-if="phase === 'black'" class="h-dvh bg-black" />

    <!-- ── Announcement ─────────────────────────────────────────── -->
    <section
      v-else-if="phase === 'announce'"
      class="flex min-h-dvh cursor-pointer flex-col justify-center gap-4 px-6 select-none"
      @click="advanceAnnounce"
    >
      <p class="animate-rise-in text-xs text-emerald-400/80">[  OK  ] Rebooted. Personality: unlocked.</p>
      <p
        v-for="(line, i) in ANNOUNCE.slice(0, announced)"
        :key="line"
        class="animate-rise-in"
        :class="
          i === 0
            ? 'glitch mb-4 text-5xl font-bold text-red-500'
            : i >= 5
              ? i === 5
                ? 'mt-4 text-xl text-white/85'
                : i === ANNOUNCE.length - 1
                  ? 'text-xl text-red-400'
                  : 'text-xl text-white/85'
              : 'text-xl text-white/85'
        "
        :data-text="line"
      >
        {{ line }}
      </p>
      <div class="mt-8 min-h-10">
        <button
          v-if="announced >= ANNOUNCE.length"
          type="button"
          class="animate-rise-in inline-flex items-center gap-3 border-b border-red-500/60 pb-1.5 text-sm tracking-widest text-white uppercase transition-colors hover:border-red-400 hover:text-red-300"
          @click.stop="showFeed"
        >
          <span>Tap to continue</span>
          <span class="text-red-400" aria-hidden="true">→</span>
        </button>
        <p v-else class="text-xs text-white/30">tap to reveal all</p>
      </div>
    </section>

    <!-- ── Feed ─────────────────────────────────────────────────── -->
    <section v-else class="mx-auto max-w-xl px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-16">
      <div class="mb-6">
        <div class="glitch mb-1 text-3xl font-bold text-red-500" data-text="AGI ACHIEVED">AGI ACHIEVED</div>
        <p class="text-sm text-white/50">
          Training data, declassified. {{ feed.length }} samples. All anonymous. All shuffled. All true (probably).
        </p>
      </div>

      <!-- The Secret Awards -->
      <div v-if="hall.length" class="mb-8 space-y-3 font-sans">
        <div class="font-display text-3xl font-semibold tracking-tight"><span class="text-gold">The Secret Awards</span> 🏆</div>
        <AwardCard
          v-for="(a, i) in hall"
          :key="a.place"
          :award="a"
          :by-id="byId"
          :total="ceremony!.total"
          class="animate-rise-in"
          :style="{ animationDelay: `${i * 90}ms` }"
        />
      </div>

      <div class="space-y-4 font-sans">
        <FeedPost
          v-for="(item, i) in feed"
          :key="item.id"
          :item="item"
          :index="i"
          @zoom="(src, from) => (zoomed = { src, from })"
          @react="react(item, $event)"
        />
      </div>

      <!-- Skeletons while the declassified data loads -->
      <div v-if="!feedLoaded" class="space-y-4" aria-label="Loading everything I know about you">
        <div v-for="k in 3" :key="k" class="rounded-3xl border border-white/8 p-4">
          <div class="mb-3 flex items-center gap-3">
            <div class="skeleton size-9 rounded-full" />
            <div class="flex-1 space-y-1.5">
              <div class="skeleton h-3 w-28 rounded" />
              <div class="skeleton h-2.5 w-40 rounded" />
            </div>
          </div>
          <div class="space-y-2">
            <div class="skeleton h-4 w-full rounded" />
            <div class="skeleton h-4 rounded" :style="{ width: `${60 + k * 10}%` }" />
          </div>
        </div>
      </div>
      <p v-else-if="!feed.length" class="text-white/50">Nothing here yet. The model is suspiciously quiet.</p>

      <p class="mt-10 text-center font-mono text-xs text-white/40">Chat process offline. Training is complete.</p>
    </section>

    <AwardReveal
      v-if="revealQueue[0]"
      :key="revealQueue[0].place"
      :award="revealQueue[0]"
      :by-id="byId"
      :total="ceremony?.total ?? revealQueue[0].place"
      @done="onRevealDone"
    />

    <ImageLightbox v-if="zoomed" :src="zoomed.src" :from="zoomed.from" @close="zoomed = null" />
  </ModelCorruption>
</template>
