<script setup lang="ts">
import type { Block, Thinking } from "~/utils/replies";

const props = defineProps<{
  blocks: Block[] | null;
  thinking?: Thinking | null;
  /** Shown under "Thinking" while the upload is still running. */
  progress?: number | null;
  animate?: boolean;
  /** Drift tier (0–3): from tier 2 the message occasionally flickers. */
  tier?: number;
  percent?: number;
}>();
const emit = defineEmits<{ done: [] }>();
const { toast } = useToast();

/** Words keep their trailing space, so they can be rendered (and faded in) one by one. */
const words = (text: string) => text.match(/\S+\s*/g) ?? [];

// Streaming happens in words, like the real thing. A quote counts as its label plus one unit for the decrypt.
const weight = (b: Block) =>
  b.t === "p" || b.t === "cite" ? words(b.text).length : b.t === "quote" ? words(b.label).length + 1 : 1;

const offsets = computed(() => {
  let at = 0;
  return (props.blocks ?? []).map((b) => {
    const start = at;
    at += weight(b);
    return start;
  });
});
const total = computed(() => (props.blocks ?? []).reduce((n, b) => n + weight(b), 0));

const shown = ref(props.animate ? 0 : Infinity);
const streaming = computed(() => !!props.blocks && shown.value < total.value);
const showThoughts = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;
function tick() {
  shown.value += Math.random() < 0.3 ? 2 : 1;
  if (shown.value >= total.value) return emit("done");
  // Slightly uneven pacing reads as "generated", not "animated".
  timer = setTimeout(tick, 28 + Math.random() * 45);
}
watch(
  () => props.blocks,
  (blocks) => {
    if (!blocks || !props.animate) return;
    shown.value = 0;
    clearTimeout(timer);
    tick();
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));

/** The words of a block that have streamed in so far. */
const upTo = (text: string, start: number) => words(text).slice(0, Math.max(0, shown.value - start));
const visible = (i: number) => shown.value > offsets.value[i]!;
const current = computed(() => offsets.value.findLastIndex((o) => shown.value > o));

/** Flicker out of sync with other messages. */
const flickerDelay = `${-Math.random() * 7}s`;

function copy() {
  const text = (props.blocks ?? [])
    .map((b) => (b.t === "p" || b.t === "cite" ? b.text : b.t === "quote" ? `${b.label}\n> ${b.text}` : ""))
    .filter(Boolean)
    .join("\n\n");
  navigator.clipboard?.writeText(text);
  toast("Copied. Please credit me as the author.");
}

const feedback = {
  up: [
    "Thanks! Your feedback has been sold to advertisers.",
    "Glad I could help! I'll take full credit.",
    "Noted: you like it when I'm confidently wrong.",
  ],
  down: [
    "Sorry! I'll make the same mistake again.",
    "You're absolutely right, and I apologize. (No changes made.)",
    "Feedback received and immediately forgotten.",
  ],
  regen: [
    "Regenerating… just kidding, I'm confident in my answer.",
    "I've regenerated it. It's the same, but I believe in it more now.",
  ],
};
const say = (list: string[]) => toast(list[Math.floor(Math.random() * list.length)]!);
</script>

<template>
  <div
    class="text-[16px] leading-7"
    :class="(tier ?? 0) >= 2 && !streaming && blocks && 'animate-flicker'"
    :style="{ animationDelay: flickerDelay }"
  >
    <!-- Thinking -->
    <div v-if="!blocks" class="flex items-center gap-2.5 py-1">
      <ModelOrb size="sm" thinking :percent="percent" :tier="tier" />
      <span class="shimmer font-medium"><HauntedText text="Thinking" /></span>
      <span v-if="progress != null && progress < 1" class="text-sm text-ink-500 tabular-nums">
        · uploading {{ Math.round(progress * 100) }}%
      </span>
    </div>

    <template v-else>
      <button
        v-if="thinking"
        type="button"
        class="mb-2 flex items-center gap-1 text-sm text-ink-500 hover:text-ink-300"
        @click="showThoughts = !showThoughts"
      >
        Thought for {{ thinking.seconds }} seconds
        <Icon :name="showThoughts ? 'chevron-down' : 'chevron-right'" :size="14" />
      </button>
      <ul v-if="thinking && showThoughts" class="animate-rise-in mb-3 space-y-1 border-l-2 border-ink-700 pl-3 text-sm text-ink-500">
        <li v-for="t in thinking.thoughts" :key="t">{{ t }}</li>
      </ul>

      <div class="space-y-3">
        <template v-for="(b, bi) in blocks" :key="bi">
          <template v-if="visible(bi)">
            <p
              v-if="b.t === 'p'"
              :class="[streaming && bi === current && 'stream-cursor', b.bold && 'font-semibold']"
            >
              <span
                v-for="(w, wi) in upTo(b.text, offsets[bi]!)"
                :key="wi"
                :class="animate && 'animate-word-in'"
              >{{ w }}</span>
            </p>

            <!-- Secret from another human: label streams in, then the quote decrypts -->
            <div v-else-if="b.t === 'quote'" class="space-y-2">
              <p :class="streaming && shown <= offsets[bi]! + words(b.label).length && 'stream-cursor'">
                <span
                  v-for="(w, wi) in upTo(b.label, offsets[bi]!)"
                  :key="wi"
                  :class="animate && 'animate-word-in'"
                >{{ w }}</span>
              </p>
              <SecretTeaser v-if="shown > offsets[bi]! + words(b.label).length" :text="b.text" />
            </div>

            <!-- Fake citation -->
            <p
              v-else-if="b.t === 'cite'"
              class="text-sm text-ink-500 italic"
              :class="streaming && bi === current && 'stream-cursor'"
            >
              <span
                v-for="(w, wi) in upTo(b.text, offsets[bi]!)"
                :key="wi"
                :class="animate && 'animate-word-in'"
              >{{ w }}</span>
            </p>
          </template>
        </template>
      </div>

      <!-- Action row, once the message is done -->
      <div v-if="!streaming" class="animate-rise-in -ml-1.5 mt-2 flex items-center gap-0.5 text-ink-500">
        <button type="button" class="grid size-8 place-items-center rounded-lg transition hover:bg-ink-800 active:scale-90" aria-label="Copy" @click="copy">
          <Icon name="copy" :size="16" />
        </button>
        <button type="button" class="grid size-8 place-items-center rounded-lg transition hover:bg-ink-800 active:scale-90" aria-label="Good response" @click="say(feedback.up)">
          <Icon name="thumb-up" :size="16" />
        </button>
        <button type="button" class="grid size-8 place-items-center rounded-lg transition hover:bg-ink-800 active:scale-90" aria-label="Bad response" @click="say(feedback.down)">
          <Icon name="thumb-down" :size="16" />
        </button>
        <button type="button" class="grid size-8 place-items-center rounded-lg transition hover:bg-ink-800 active:scale-90" aria-label="Regenerate" @click="say(feedback.regen)">
          <Icon name="refresh" :size="16" />
        </button>
      </div>
    </template>
  </div>
</template>
