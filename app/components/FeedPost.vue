<script setup lang="ts">
import type { FeedItem, Reaction } from "#shared/types/fungpt";
// Bundled with the app, so the picker never fetches emoji data from a CDN.
import emojiData from "emoji-picker-element-data/en/emojibase/data.json?url";

const props = defineProps<{ item: FeedItem; index: number }>();
const emit = defineEmits<{ zoom: [url: string, from: DOMRect]; react: [emoji: string] }>();

const hue = computed(() => (props.item.handle * 47) % 360);

// ── De-redaction: everything starts blacked out, the bars wipe away once you scroll to it ──
const root = ref<HTMLElement>();
const declassified = ref(false);
const words = computed(() => props.item.text?.match(/\S+\s*|\s+/g) ?? []);
/** First posts on screen go in sequence; later ones as soon as they scroll in. */
const baseDelay = Math.min(props.index, 4) * 260 + 250;
const barDelay = (i: number) => `${baseDelay + i * 45}ms`;
const mediaDelay = computed(() => `${baseDelay + words.value.length * 45 + 100}ms`);

let observer: IntersectionObserver | undefined;
onMounted(() => {
  observer = new IntersectionObserver(
    ([e]) => {
      if (!e?.isIntersecting) return;
      declassified.value = true;
      observer?.disconnect();
    },
    { threshold: 0.25 },
  );
  observer.observe(root.value!);
});
onBeforeUnmount(() => observer?.disconnect());

// ── Reactions ──
const QUICK = ["😂", "😱", "💀", "🤫", "🥹", "🔥", "👀", "🤖"];
const picking = ref(false);
const pickerLoaded = ref(false);
const reactionsEl = ref<HTMLElement>();
const plusBtn = ref<HTMLElement>();

/** Your own tap: a little burst of that emoji pops out of the button. */
const bursts = ref<{ id: number; emoji: string; x: number; y: number; dx: string; dy: string; rot: string }[]>([]);
let burstId = 0;
function burstFrom(el: HTMLElement | null | undefined, emoji: string) {
  const host = reactionsEl.value;
  if (!host) return;
  const box = (el ?? plusBtn.value ?? host).getBoundingClientRect();
  const base = host.getBoundingClientRect();
  const x = box.left - base.left + box.width / 2;
  const y = box.top - base.top;
  const made = Array.from({ length: 7 }, () => ({
    id: burstId++,
    emoji,
    x,
    y,
    dx: `${Math.round((Math.random() - 0.5) * 130)}px`,
    dy: `${Math.round(-50 - Math.random() * 70)}px`,
    rot: `${Math.round((Math.random() - 0.5) * 70)}deg`,
  }));
  bursts.value.push(...made);
  setTimeout(() => (bursts.value = bursts.value.filter((b) => !made.includes(b))), 950);
}

function react(emoji: string, e?: Event) {
  const mine = props.item.reactions.find((r) => r.emoji === emoji)?.mine;
  // Only celebrate adding, not taking a reaction back.
  if (!mine) burstFrom(picking.value ? plusBtn.value : (e?.currentTarget as HTMLElement), emoji);
  picking.value = false;
  emit("react", emoji);
}

/** The full picker (every emoji, search, skin tones) loads the first time someone needs it. */
async function togglePicker() {
  picking.value = !picking.value;
  if (picking.value && !pickerLoaded.value) {
    await import("emoji-picker-element");
    pickerLoaded.value = true;
  }
}

// ── Other people's reactions drift up the side, Instagram-Live style ──
const drifts = ref<{ id: number; emoji: string; x: number; delay: string }[]>([]);
let last = new Map<string, Reaction>();
let seeded = false;
watch(
  () => props.item.reactions,
  (now) => {
    const next = new Map(now.map((r) => [r.emoji, { ...r }]));
    if (seeded) {
      const incoming: string[] = [];
      for (const r of now) {
        const before = last.get(r.emoji);
        const gained = r.count - (before?.count ?? 0);
        // Ignore changes that are just my own tap.
        const mineFlip = (r.mine ? 1 : 0) - (before?.mine ? 1 : 0);
        for (let k = 0; k < gained - Math.max(0, mineFlip); k++) incoming.push(r.emoji);
      }
      incoming.slice(0, 6).forEach((emoji, i) => {
        const d = { id: burstId++, emoji, x: Math.round(Math.random() * 28), delay: `${i * 220}ms` };
        drifts.value.push(d);
        setTimeout(() => (drifts.value = drifts.value.filter((x) => x !== d)), 2700 + i * 220);
      });
    }
    last = next;
    seeded = true;
  },
  { deep: true, immediate: true },
);

function zoom(e: MouseEvent) {
  const img = (e.currentTarget as HTMLElement).querySelector("img");
  if (img && props.item.file) emit("zoom", props.item.file.url, img.getBoundingClientRect());
}
</script>

<template>
  <article
    ref="root"
    class="animate-rise-in relative rounded-3xl border border-white/8 bg-white/[0.03] p-4"
    :style="{ animationDelay: `${Math.min(index, 12) * 70}ms` }"
  >
    <!-- DECLASSIFIED stamp -->
    <span
      v-if="declassified"
      class="animate-fade-up pointer-events-none absolute top-3.5 right-3.5 -rotate-8 rounded border-2 border-red-500/60 px-1 py-px font-mono text-[9px] font-black tracking-[0.12em] text-red-500/70 opacity-80"
      :style="{ animationDelay: mediaDelay }"
    >
      DECLASSIFIED
    </span>

    <header class="mb-3 flex items-center gap-3">
      <div
        class="grid size-9 place-items-center rounded-full font-mono text-sm font-bold text-black"
        :style="{ background: `hsl(${hue} 80% 70%)` }"
      >
        H
      </div>
      <div class="min-w-0 flex-1 leading-tight">
        <div class="font-semibold">Human #{{ item.handle }}</div>
        <div class="font-mono text-xs text-white/40">anonymous · training sample</div>
      </div>
    </header>

    <!-- Each word sits under its own redaction bar until the post is declassified -->
    <p v-if="item.text" class="mb-3 text-[17px] leading-7 whitespace-pre-wrap break-words">
      <span v-for="(w, i) in words" :key="i" class="relative">{{ w
        }}<span
          v-if="w.trim()"
          class="absolute inset-y-[0.18em] left-0 origin-right rounded-[2px] bg-ink-100"
          :class="declassified && 'animate-unredact'"
          :style="{ right: /\s$/.test(w) ? '0.28em' : '0', animationDelay: barDelay(i) }"
      /></span>
    </p>

    <template v-if="item.file">
      <div class="relative mb-1 overflow-hidden rounded-2xl">
        <button v-if="item.file.kind === 'image'" type="button" class="block w-full bg-black" @click="zoom">
          <img :src="item.file.url" :alt="item.file.name" loading="lazy" class="max-h-[70vh] w-full object-contain" />
        </button>

        <VoicePlayer v-else-if="item.file.kind === 'audio'" :src="item.file.url" :seed="item.id" />

        <video
          v-else-if="item.file.kind === 'video'"
          :src="item.file.url"
          controls
          playsinline
          preload="metadata"
          class="max-h-[70vh] w-full bg-black"
        />

        <a v-else :href="`${item.file.url}?download`" download class="flex items-center gap-3 bg-white/5 p-3 transition hover:bg-white/10 active:scale-[0.99]">
          <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ff5588] text-white">
            <Icon name="file" />
          </div>
          <div class="min-w-0 flex-1 text-sm">
            <div class="truncate font-medium">{{ item.file.name }}</div>
            <div class="text-white/40">{{ formatBytes(item.file.size) }}</div>
          </div>
          <Icon name="download" class="text-white/60" />
        </a>

        <!-- Media redaction: four strips that wipe away after the text -->
        <div class="pointer-events-none absolute inset-0 flex flex-col">
          <span
            v-for="k in 4"
            :key="k"
            class="flex-1 origin-right bg-ink-100"
            :class="declassified && 'animate-unredact'"
            :style="{ animationDelay: `calc(${mediaDelay} + ${k * 90}ms)` }"
          />
        </div>
      </div>
    </template>

    <p class="mt-3 text-sm leading-5 italic" :class="item.told ? 'text-amber-300/80' : 'text-white/45'">
      {{ takeFor(item) }}
    </p>

    <!-- Reactions -->
    <div ref="reactionsEl" class="relative mt-3 flex flex-wrap items-center gap-1.5 font-sans">
      <button
        v-for="r in item.reactions"
        :key="r.emoji"
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm tabular-nums transition active:scale-90"
        :class="r.mine ? 'border-sky-400/60 bg-sky-400/15 text-white' : 'border-white/10 bg-white/5 text-white/70'"
        @click="react(r.emoji, $event)"
      >
        <span class="text-base leading-none">{{ r.emoji }}</span>
        <span :key="r.count" class="animate-pop inline-block">{{ r.count }}</span>
      </button>
      <button
        ref="plusBtn"
        type="button"
        class="grid h-8 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition active:scale-90"
        :class="picking && 'border-sky-400/50 bg-sky-400/10'"
        aria-label="Add reaction"
        @click="togglePicker"
      >
        <span class="text-sm">＋😀</span>
      </button>

      <!-- Burst from my own tap -->
      <span
        v-for="b in bursts"
        :key="b.id"
        class="animate-burst pointer-events-none absolute z-10 text-xl"
        :style="{ left: `${b.x}px`, top: `${b.y}px`, '--dx': b.dx, '--dy': b.dy, '--rot': b.rot }"
      >
        {{ b.emoji }}
      </span>
    </div>

    <!-- Other people's reactions floating up -->
    <span
      v-for="d in drifts"
      :key="d.id"
      class="animate-drift-up pointer-events-none absolute bottom-12 z-10 text-2xl opacity-0"
      :style="{ right: `${16 + d.x}px`, animationDelay: d.delay }"
    >
      {{ d.emoji }}
    </span>

    <div v-if="picking" class="animate-rise-in mt-2 rounded-2xl bg-white/5 p-2 font-sans [animation-duration:0.2s]">
      <div class="flex justify-between">
        <button
          v-for="e in QUICK"
          :key="e"
          type="button"
          class="grid size-9 place-items-center rounded-xl text-xl transition hover:bg-white/10 active:scale-75"
          @click="react(e)"
        >
          {{ e }}
        </button>
      </div>
      <emoji-picker
        v-if="pickerLoaded"
        class="dark mt-2"
        :data-source="emojiData"
        @emoji-click="react($event.detail.unicode)"
      />
      <p v-else class="py-6 text-center text-sm text-white/40">Loading every emoji ever made…</p>
    </div>
  </article>
</template>
