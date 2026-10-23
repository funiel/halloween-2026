<script setup lang="ts">
/**
 * Voice notes as a waveform instead of the browser's grey audio bar. The
 * waveform is decoded from the actual file; if the phone can't decode it
 * (e.g. webm on an old iPhone), a stable fake one stands in.
 */
const props = defineProps<{ src: string; seed: string }>();

const BARS = 42;
const peaks = ref<number[]>(fakePeaks());
const playing = ref(false);
const progress = ref(0);
const duration = ref(0);

let audio: HTMLAudioElement | null = null;
let raf = 0;

function fakePeaks() {
  let h = [...props.seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: BARS }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 0.25 + ((h >>> 16) % 1000) / 1000 * 0.75;
  });
}

async function decodePeaks() {
  try {
    const data = await (await fetch(props.src)).arrayBuffer();
    const buf = await audioDecoder().decodeAudioData(data);
    const ch = buf.getChannelData(0);
    const size = Math.floor(ch.length / BARS);
    const rms = Array.from({ length: BARS }, (_, i) => {
      let sum = 0;
      for (let j = i * size; j < (i + 1) * size; j++) sum += ch[j]! * ch[j]!;
      return Math.sqrt(sum / size);
    });
    const max = Math.max(...rms, 0.0001);
    peaks.value = rms.map((v) => 0.15 + (v / max) * 0.85);
    duration.value ||= buf.duration;
  } catch {
    // Keep the fake waveform.
  }
}

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio(props.src);
  audio.preload = "metadata";
  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio!.duration)) duration.value = audio!.duration;
  });
  audio.addEventListener("ended", () => {
    playing.value = false;
    progress.value = 0;
  });
  audio.addEventListener("pause", () => (playing.value = false));
  audio.addEventListener("play", () => {
    playing.value = true;
    // Only one voice note at a time.
    window.dispatchEvent(new CustomEvent("fungpt-play", { detail: props.seed }));
    tick();
  });
  return audio;
}

function tick() {
  cancelAnimationFrame(raf);
  const step = () => {
    if (!audio || audio.paused) return;
    const d = Number.isFinite(audio.duration) ? audio.duration : duration.value;
    progress.value = d ? audio.currentTime / d : 0;
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function toggle() {
  const a = ensureAudio();
  if (a.paused) void a.play();
  else a.pause();
}

function seek(e: MouseEvent) {
  const a = ensureAudio();
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
  const d = Number.isFinite(a.duration) ? a.duration : duration.value;
  if (d) a.currentTime = f * d;
  progress.value = f;
  if (a.paused) void a.play();
}

function onOtherPlay(e: Event) {
  if ((e as CustomEvent).detail !== props.seed) audio?.pause();
}

const time = computed(() => {
  const s = Math.round(playing.value || progress.value ? progress.value * duration.value : duration.value);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
});

onMounted(() => {
  ensureAudio();
  void decodePeaks();
  addEventListener("fungpt-play", onOtherPlay);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  audio?.pause();
  removeEventListener("fungpt-play", onOtherPlay);
});
</script>

<template>
  <div class="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5 pr-3">
    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black transition active:scale-90"
      :aria-label="playing ? 'Pause' : 'Play'"
      @click="toggle"
    >
      <svg v-if="playing" viewBox="0 0 24 24" class="size-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      <svg v-else viewBox="0 0 24 24" class="ml-0.5 size-4" fill="currentColor"><path d="M7 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L8.5 4.64A1 1 0 0 0 7 5.5Z" /></svg>
    </button>
    <button type="button" class="flex h-9 flex-1 items-center gap-[2px]" aria-label="Seek" @click="seek">
      <span
        v-for="(p, i) in peaks"
        :key="i"
        class="flex-1 rounded-full transition-[height,background-color] duration-300"
        :class="i / peaks.length < progress ? 'bg-white' : 'bg-white/25'"
        :style="{ height: `${Math.round(p * 100)}%` }"
      />
    </button>
    <span class="w-9 shrink-0 text-right font-mono text-xs text-white/60 tabular-nums">{{ time }}</span>
  </div>
</template>
