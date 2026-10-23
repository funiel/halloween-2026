<script setup lang="ts">
import type { Award, FeedItem } from "#shared/types/fungpt";

/**
 * Full-screen award reveal, played on every open feed when the operator
 * presses "Reveal next award". Normal awards open a golden envelope; the
 * grand finale gets velvet curtains and fireworks. Tap skips ahead a step.
 */
const props = defineProps<{ award: Award; byId: Map<string, FeedItem>; total: number }>();
const emit = defineEmits<{ done: [] }>();

type Step = "pre" | "intro" | "open" | "title" | "drum" | "winner" | "done";
// ms from start; the finale takes its time.
const TIMELINE: [Step, number][] = props.award.finale
  ? [["pre", 0], ["intro", 2000], ["open", 4300], ["title", 5100], ["drum", 7400], ["winner", 9800], ["done", 12500]]
  : [["intro", 0], ["title", 1700], ["drum", 3500], ["winner", 5300], ["done", 7000]];

const index = ref(0);
const step = computed(() => TIMELINE[index.value]![0]);
const reached = (s: Step) => {
  const at = TIMELINE.findIndex(([name]) => name === s);
  return at !== -1 && index.value >= at;
};

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
  if (s === "drum") {
    // A drumroll in your hand (Android only; iPhones don't allow vibration).
    navigator.vibrate?.(Array.from({ length: props.award.finale ? 22 : 14 }, (_, i) => (i % 2 ? 35 : 25)));
  }
  if (s !== "winner") return;
  navigator.vibrate?.(props.award.finale ? [120, 60, 120, 60, 400] : [60, 40, 160]);
  if (props.award.finale) {
    fireworks({ rockets: 11, duration: 7000 });
    confetti({ from: "sides", count: 220, duration: 5000 });
    setTimeout(() => confetti({ count: 260, duration: 5000 }), 700);
    setTimeout(() => confetti({ from: "sides", count: 180, duration: 4500 }), 2100);
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
  navigator.vibrate?.(0);
});
</script>

<template>
  <div class="spotlight fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6 text-center font-sans" @click="tap">
    <!-- The stage (behind the curtains for the finale) -->
    <template v-if="!award.finale || reached('open')">
      <div class="animate-fade-up mb-2 font-mono text-[11px] tracking-[0.3em] text-amber-200/60">
        {{ award.finale ? "THE GRAND FINALE" : `AWARD ${award.place} OF ${total}` }}
      </div>
      <p v-if="!award.finale" class="animate-fade-up font-display text-xl text-white/75 italic">And the award for…</p>

      <div v-if="reached('title')" class="relative my-4 grid place-items-center">
        <div v-if="award.finale" class="rays pointer-events-none absolute size-[560px]" />
        <!-- Two layers: the drop and the glow are separate animations -->
        <div class="animate-glow-pulse relative">
          <div class="animate-award-drop leading-none" :class="award.finale ? 'text-[9rem]' : 'text-8xl'">
            {{ award.emoji ?? "🏆" }}
          </div>
        </div>
      </div>
      <h2
        v-if="reached('title')"
        class="animate-fade-up animate-delay-450 text-gold relative max-w-md font-display leading-tight font-black"
        :class="award.finale ? 'text-5xl' : 'text-4xl'"
      >
        {{ award.title }}
      </h2>

      <p v-if="reached('drum')" class="animate-fade-up drumroll mt-5 font-display text-lg text-white/70 italic">
        {{ award.winners.length > 1 ? "is shared by" : "goes to" }}<span>.</span><span>.</span><span>.</span>
      </p>

      <!-- Normal awards: the golden envelope -->
      <div v-if="!award.finale && reached('drum')" class="relative mt-4 h-44 w-full max-w-md">
        <div
          class="absolute inset-x-6 bottom-0 h-36 transition duration-700"
          :class="reached('winner') ? 'translate-y-24 opacity-0' : 'animate-[shake_0.18s_steps(2)_infinite]'"
        >
          <div class="absolute inset-0 rounded-xl bg-linear-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_20px_60px_rgb(251_191_36/0.35)]" />
          <div class="absolute inset-x-0 bottom-0 h-1/2 rounded-b-xl bg-linear-to-t from-amber-600/60 to-transparent" />
          <!-- Flap -->
          <div
            class="absolute inset-x-0 top-0 h-1/2 origin-top bg-linear-to-b from-amber-300 to-amber-500 [clip-path:polygon(0_0,100%_0,50%_100%)] [backface-visibility:hidden]"
            :class="reached('winner') && 'animate-envelope-flap'"
          />
          <div class="absolute inset-0 grid place-items-center pt-6 font-display text-sm font-bold tracking-[0.3em] text-amber-900/60">FUNGPT</div>
        </div>
      </div>

      <div v-if="reached('winner')" class="w-full max-w-md space-y-2" :class="award.finale ? 'mt-4' : '-mt-40'">
        <template v-if="award.winners.length">
          <div
            v-for="(id, i) in award.winners.slice(0, 3)"
            :key="id"
            :class="award.finale ? 'animate-award-flip' : 'animate-envelope-card animate-delay-300'"
            :style="i ? { animationDelay: `${300 + i * 150}ms` } : undefined"
          >
            <AwardWinner :item="byId.get(id)" :big="award.finale" />
          </div>
          <p class="animate-fade-up animate-delay-700 font-mono text-xs text-amber-200/70">
            with <RollingNumber :value="String(award.count)" /> {{ award.emoji ?? "reactions" }}
          </p>
        </template>
        <p v-else class="animate-award-flip font-display text-xl text-white/80 italic">Nobody. The model keeps this one for itself.</p>
      </div>
    </template>

    <!-- Finale: red velvet curtains carry the build-up, then sweep open -->
    <template v-if="award.finale">
      <div
        v-for="side in ['left', 'right'] as const"
        :key="side"
        class="pointer-events-none absolute inset-y-0 z-10 w-1/2 bg-[repeating-linear-gradient(90deg,#5c0f14_0_10px,#8f1d24_10px_22px,#a3262e_22px_28px,#7a161c_28px_40px)] shadow-[inset_0_-40px_60px_rgb(0_0_0/0.6)]"
        :class="[
          side === 'left' ? 'left-0 origin-left' : 'right-0 origin-right',
          reached('open') && (side === 'left' ? 'animate-curtain-left' : 'animate-curtain-right'),
        ]"
      >
        <div class="absolute inset-x-0 bottom-0 h-3 bg-[repeating-linear-gradient(90deg,#fbbf24_0_6px,#b45309_6px_10px)]" />
        <div class="absolute inset-y-0 w-6 bg-linear-to-r from-black/50 to-transparent" :class="side === 'left' ? 'right-0 rotate-180' : 'left-0'" />
      </div>
      <!-- A warm spotlight on the closed curtain -->
      <div
        class="pointer-events-none absolute inset-0 z-[15] bg-[radial-gradient(ellipse_at_50%_45%,rgb(255_220_170/0.22),transparent_55%)] transition-opacity duration-700"
        :class="reached('open') && 'opacity-0'"
      />
      <!-- Pelmet -->
      <div class="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-linear-to-b from-[#4a0b10] to-[#7a161c] shadow-[0_8px_30px_rgb(0_0_0/0.6)]">
        <div class="absolute inset-x-0 bottom-0 h-2 bg-[repeating-linear-gradient(90deg,#fcd34d_0_8px,#b45309_8px_12px)]" />
      </div>

      <div v-if="!reached('open')" class="relative z-30">
        <p class="animate-fade-up font-display text-2xl text-amber-100/80 italic">And now…</p>
        <p v-if="reached('intro')" class="animate-fade-up text-gold mt-4 font-display text-4xl leading-tight font-black">
          The final award<br />of the night.
        </p>
      </div>
    </template>

    <p v-if="reached('done')" class="animate-fade-up absolute bottom-[max(env(safe-area-inset-bottom),1.5rem)] z-30 text-xs text-white/40">
      tap to continue
    </p>
  </div>
</template>
