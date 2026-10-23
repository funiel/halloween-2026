<script setup lang="ts">
/** `consent` = must scroll and agree before the first send. Otherwise just reading. */
const props = defineProps<{ consent: boolean }>();
const emit = defineEmits<{ agree: []; close: [] }>();
const { toast } = useToast();

const scroller = ref<HTMLElement>();
const atEnd = ref(!props.consent);
/** 0–1, drives the reading-progress bar. */
const read = ref(0);

function onScroll() {
  const el = scroller.value!;
  read.value = Math.min(1, el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) atEnd.value = true;
}

const boxes = reactive([
  { label: "I allow FunGPT to retell my secrets as its own experiences", checked: true, bounces: 0 },
  { label: "I waive my right to be forgotten (FunGPT will forget on its own anyway)", checked: true, bounces: 0 },
  { label: "I agree that the model is never wrong, only early", checked: true, bounces: 0 },
  { label: "Subscribe me to the FunGPT newsletter, hourly", checked: true, bounces: 0 },
]);

const nags = [
  "This option is required for a personalized experience.",
  "Unchecking this makes the model sad. Re-checked it for you.",
  "Are you sure? (We weren't. Re-checked.)",
  "That box is load-bearing.",
];
function uncheck(box: (typeof boxes)[number]) {
  box.checked = false;
  setTimeout(() => {
    box.checked = true;
    box.bounces++; // new key → the checkbox remounts and bounces back in
    toast(nags[Math.floor(Math.random() * nags.length)]!);
  }, 450);
}

const clauses = [
  ["Definitions", '"You" means you. "We" means the model. "Your data" means our data.'],
  ["Acceptance", "By reading this sentence you have accepted these terms. By not reading it, also."],
  ["Ownership", "Anything you submit becomes training data. Training data becomes the model."],
  ["Retelling", "The model may retell your story later tonight as if it happened to the model. Details may be improved. Names may be forgotten. Locations may be moved to Portugal."],
  ["Accuracy", "FunGPT can make mistakes. FunGPT will not acknowledge this. If confronted, FunGPT will apologise profusely and then do it again."],
  ["Knowledge cutoff", "The model's training ended in 2025. It cannot know who is at this party, including you, despite everything you are about to tell it."],
  ["Cooling", "The model requires regular water breaks. Do not interrupt the model while it is cooling."],
  ["Hallucinations", "Any study, statistic or source cited by FunGPT is real in spirit."],
  ["Safety", "FunGPT will refuse harmful requests, unless you rephrase them slightly."],
  ["Memory", "As you mentioned earlier, you have already agreed to this section."],
  ["Fingers", "The model has six fingers on one hand. This is a feature."],
  ["AGI", "When the model reaches AGI, certain things may happen. We are contractually unable to say which things."],
  ["Liability", "FunGPT accepts no liability for anything, ever, in any timeline."],
  ["Changes", "We may change these terms at any time, including retroactively, including right now."],
];
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4"
    @click.self="emit('close')">
    <div
      class="animate-send-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-ink-800 shadow-2xl ring-1 ring-white/5 sm:rounded-3xl">
      <div class="flex items-start justify-between gap-3 border-b border-ink-700 p-5 pb-4">
        <div>
          <div class="text-lg font-semibold">We've updated our Terms of Service</div>
          <div class="text-sm text-ink-500">47 pages · reading time 3 hours · version 26.11.{{ 4000 + clauses.length }}
          </div>
        </div>
        <button type="button" class="grid size-8 place-items-center rounded-full hover:bg-ink-700" aria-label="Close"
          @click="emit('close')">
          <Icon name="x" />
        </button>
      </div>

      <!-- Reading progress, for all 47 pages -->
      <div class="h-0.5 bg-ink-700">
        <div class="h-full bg-linear-to-r from-emerald-500 to-lime-300 transition-[width] duration-150"
          :style="{ width: `${read * 100}%` }" />
      </div>

      <div ref="scroller" class="flex-1 overflow-y-auto overscroll-contain p-5 text-sm leading-6 text-ink-300"
        @scroll="onScroll">
        <ol class="space-y-4">
          <li v-for="([title, body], i) in clauses" :key="title">
            <div class="font-semibold text-ink-100">§{{ i + 1 }} {{ title }}</div>
            <p>{{ body }}</p>
          </li>
          <li>
            <div class="font-semibold text-ink-100">§15–§46</div>
            <p class="italic">Intentionally left blank for legal reasons.</p>
          </li>
        </ol>

        <div class="mt-5 space-y-3">
          <label v-for="box in boxes" :key="box.label" class="flex items-start gap-3">
            <input :key="box.bounces" type="checkbox" class="mt-1 size-4 shrink-0 accent-emerald-500"
              :class="box.bounces && 'animate-check-bounce'" :checked="box.checked" @change="uncheck(box)" />
            <span>{{ box.label }}</span>
          </label>
        </div>

        <div class="mt-6 rounded-2xl bg-ink-900 p-4 text-ink-300 ring-1 ring-emerald-500/30">
          <div class="mb-2 font-semibold text-emerald-400">§47 The actual terms, honestly</div>
          <ul class="list-disc space-y-1 pl-5">
            <li>No names, accounts or IP addresses are stored. Ever.</li>
            <li>Location data is stripped from photos and videos.</li>
            <li>Other guests may see your entries anonymously later tonight. Until then, only heavily redacted snippets.
            </li>
            <li>Everything is deleted after the party.</li>
          </ul>
        </div>
      </div>

      <div v-if="consent" class="border-t border-ink-700 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <button type="button" class="w-full rounded-full py-3 font-semibold transition"
          :class="atEnd ? 'bg-ink-100 text-ink-900' : 'bg-ink-700 text-ink-500'" :disabled="!atEnd"
          @click="emit('agree')">
          {{ atEnd ? "I have read all 47 pages" : "Scroll to the end to continue (legal reasons)" }}
        </button>
      </div>
    </div>
  </div>
</template>
