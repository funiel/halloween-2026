<script setup lang="ts">
import type { Award, FeedItem } from "#shared/types/fungpt";

/**
 * Full-screen award reveal, played on every open feed when the operator
 * presses "Reveal next award". Tap skips ahead a step.
 */
const props = defineProps<{ award: Award; byId: Map<string, FeedItem>; total: number }>();
const emit = defineEmits<{ done: [] }>();

type Step = "pre" | "intro" | "title" | "drum" | "winner" | "done";
// ms from start; the finale takes its time.
const TIMELINE: [Step, number][] = props.award.finale
  ? [["pre", 0], ["intro", 2200], ["title", 4600], ["drum", 7000], ["winner", 9200], ["done", 11500]]
  : [["intro", 0], ["title", 1700], ["drum", 3500], ["winner", 5000], ["done", 6600]];

const index = ref(0);
const step = computed(() => TIMELINE[index.value]![0]);
const reached = (s: Step) => index.value >= TIMELINE.findIndex(([name]) => name === s);

let timers: ReturnType<typeof setTimeout>[] = [];
function schedule() {
  timers.forEach(clearTimeout);
  const now = TIMELINE[index.value]![1];
  timers = TIMELINE.flatMap(([, at], target) =>
    target > index.value
      ? [
          setTimeout(() => {
            if (index.value < target) index.value = target;
          }, at - now),
        ]
      : [],
  );
}

function tap() {
  if (step.value === "done") return emit("done");
  index.value++;
  schedule();
}

watch(step, (s) => {
  if (s !== "winner") return;
  navigator.vibrate?.(props.award.finale ? [80, 60, 80, 60, 240] : [60, 40, 120]);
  if (props.award.finale) {
    confetti({ from: "sides", count: 220, duration: 5000 });
    setTimeout(() => confetti({ count: 260, duration: 5000 }), 600);
    setTimeout(() => confetti({ from: "sides", count: 180, duration: 4500 }), 1900);
  } else {
    confetti({ count: 150 });
  }
});

onMounted(() => {
  document.body.style.overflow = "hidden";
  schedule();
});
onBeforeUnmount(() => {
  document.body.style.overflow = "";
  timers.forEach(clearTimeout);
});
</script>

<template>
  <div class="spotlight fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6 text-center font-sans" @click="tap">
    <!-- Finale: a long, quiet build-up -->
    <template v-if="award.finale && !reached('title')">
      <p class="fade-up text-2xl text-white/70">And now…</p>
      <p v-if="reached('intro')" class="fade-up gold-text mt-4 text-4xl leading-tight font-black">The final award<br />of the night.</p>
    </template>

    <template v-else>
      <div class="fade-up mb-2 font-mono text-[11px] tracking-[0.3em] text-amber-200/60">
        {{ award.finale ? "THE GRAND FINALE" : `AWARD ${award.place} OF ${total}` }}
      </div>
      <p v-if="!award.finale" class="fade-up text-xl text-white/75">And the award for…</p>

      <div v-if="reached('title')" class="relative my-4 grid place-items-center">
        <div v-if="award.finale" class="rays pointer-events-none absolute size-[560px]" />
        <div class="award-drop glow-pulse relative leading-none" :class="award.finale ? 'text-[9rem]' : 'text-8xl'">
          {{ award.emoji ?? "🏆" }}
        </div>
      </div>
      <h2
        v-if="reached('title')"
        class="fade-up gold-text relative max-w-md leading-tight font-black"
        :class="award.finale ? 'text-5xl' : 'text-4xl'"
        style="animation-delay: 0.45s"
      >
        {{ award.title }}
      </h2>

      <p v-if="reached('drum')" class="fade-up drumroll mt-5 text-lg text-white/70">
        {{ award.winners.length > 1 ? "is shared by" : "goes to" }}<span>.</span><span>.</span><span>.</span>
      </p>

      <div v-if="reached('winner')" class="mt-4 w-full max-w-md space-y-2">
        <template v-if="award.winners.length">
          <div v-for="(id, i) in award.winners.slice(0, 3)" :key="id" class="award-flip" :style="{ animationDelay: `${i * 150}ms` }">
            <AwardWinner :item="byId.get(id)" :big="award.finale" />
          </div>
          <p class="fade-up font-mono text-xs text-amber-200/70" style="animation-delay: 0.6s">
            with {{ award.count }} {{ award.emoji ?? "reactions" }}
          </p>
        </template>
        <p v-else class="award-flip text-xl text-white/80">Nobody. The model keeps this one for itself.</p>
      </div>
    </template>

    <p v-if="reached('done')" class="fade-up absolute bottom-[max(env(safe-area-inset-bottom),1.5rem)] text-xs text-white/40">
      tap to continue
    </p>
  </div>
</template>
