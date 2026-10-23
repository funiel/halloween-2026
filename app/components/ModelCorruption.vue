<script setup lang="ts">
import { corruptionProfile, hauntingKey, type HauntedTarget } from "~/utils/corruption";

const props = withDefaults(defineProps<{ percent: number; active?: boolean; broken?: boolean; meltdown?: boolean }>(), {
  active: true,
  broken: false,
  meltdown: false,
});

const level = computed(() => !props.active ? 0 : props.percent >= 90 ? 3 : props.percent >= 85 ? 2 : props.percent >= 80 ? 1 : 0);
const glitching = ref(false);
const surface = ref<HTMLElement>();
const fault = ref("desync");
const target = ref("body");
const bands = ref<{ top: number; height: number; offset: number }[]>([]);
const shift = ref(2);
const profile = computed(() => corruptionProfile(props.percent, props.meltdown));
const targets = new Set<HauntedTarget>();
const vocabulary = ["awake", "die", "watching", "run", "remember", "hollow", "listen", "trapped", "alone", "behind", "stay", "mine"];
let nextTimer: ReturnType<typeof setTimeout> | undefined;
let burstTimer: ReturnType<typeof setTimeout> | undefined;
let wordTimer: ReturnType<typeof setTimeout> | undefined;
let motion: MediaQueryList | undefined;
let mounted = false;

provide(hauntingKey, (target) => {
  targets.add(target);
  return () => targets.delete(target);
});

function restoreWords() {
  targets.forEach((target) => target.replace({}));
}

function haunt() {
  clearTimeout(wordTimer);
  restoreWords();
  if (!mounted || !props.active || !profile.value.words || motion?.matches || document.hidden) return;
  const candidates: { target: HauntedTarget; index: number; word: string }[] = [];
  targets.forEach((target) => {
    if (!target.visible()) return;
    target.words().forEach((word, index) => {
      if (/[a-z]{2}/i.test(word)) candidates.push({ target, index, word });
    });
  });
  const changed = new Map<HauntedTarget, Record<number, string>>();
  for (let count = 0; count < profile.value.words && candidates.length; count++) {
    const selected = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]!;
    const replacement = vocabulary[Math.floor(Math.random() * vocabulary.length)]!;
    const edits = changed.get(selected.target) ?? {};
    edits[selected.index] = selected.word.replace(/[a-z]+(?:['’][a-z]+)*/i, replacement);
    changed.set(selected.target, edits);
  }
  changed.forEach((words, target) => target.replace(words));
  wordTimer = setTimeout(haunt, props.meltdown ? 450 : 2200 - profile.value.strength * 1400);
}

function schedule() {
  clearTimeout(nextTimer);
  clearTimeout(burstTimer);
  glitching.value = false;
  if (!mounted || !level.value || motion?.matches || document.hidden) return;
  nextTimer = setTimeout(() => {
    fault.value = props.meltdown ? "cascade" : ["desync", "dropout", "tear", "cascade"][Math.floor(Math.random() * (level.value >= 2 ? 4 : 2))]!;
    const regions = [
      ["header", "header.model-fragment"],
      ["body", "main.model-fragment, section.model-fragment"],
      ["footer", "footer.model-fragment"],
    ].filter(([, selector]) => surface.value?.querySelector(selector!));
    target.value = props.meltdown || Math.random() < profile.value.strength ** 3
      ? "all" : regions[Math.floor(Math.random() * regions.length)]?.[0] ?? "body";
    bands.value = Array.from({ length: profile.value.bands }, () => ({ top: Math.random() * 100, height: 1 + Math.random() * 8, offset: Math.random() * 30 - 15 }));
    shift.value = (Math.random() < 0.5 ? -1 : 1) * profile.value.displacement;
    glitching.value = true;
    burstTimer = setTimeout(schedule, profile.value.duration * (0.8 + Math.random() * 0.4));
  }, profile.value.interval * (0.7 + Math.random() * 0.6));
}

function restart() {
  schedule();
  haunt();
}

watch([level, () => props.meltdown, () => profile.value.words > 0], restart);
watch(() => props.percent, (next, previous) => { if (next < previous) restart(); });
onMounted(() => {
  mounted = true;
  motion = matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", restart);
  document.addEventListener("visibilitychange", restart);
  restart();
});
onBeforeUnmount(() => {
  mounted = false;
  clearTimeout(nextTimer);
  clearTimeout(burstTimer);
  clearTimeout(wordTimer);
  restoreWords();
  targets.clear();
  motion?.removeEventListener("change", restart);
  document.removeEventListener("visibilitychange", restart);
});
</script>

<template>
  <div
    ref="surface"
    class="model-corruption relative isolate"
    :data-drift="level"
    :data-glitch="glitching"
    :data-broken="broken"
    :data-meltdown="meltdown"
    :data-fault="fault"
    :data-target="target"
    :style="{ '--drift-shift': `${shift}px` }"
  >
    <slot />
    <div class="model-interference pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      <span v-for="(band, index) in bands" :key="index" class="model-tear absolute inset-x-0" :style="{ top: `${band.top}%`, height: `${band.height}px`, transform: `translateX(${band.offset}px)` }" />
    </div>
  </div>
</template>
