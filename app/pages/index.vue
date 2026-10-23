<script setup lang="ts">
import type { AgiStatus } from "#shared/types/fungpt";
import type { Block, Thinking } from "~/utils/replies";
import type ChatComposer from "~/components/ChatComposer.vue";

type Message =
  | { id: number; role: "user"; text: string; file: File | null; progress: number | null }
  | {
    id: number;
    role: "assistant";
    blocks: Block[] | null;
    thinking: Thinking | null;
    progress: number | null;
    animate: boolean;
  };

const { toast } = useToast();
const composer = ref<InstanceType<typeof ChatComposer>>();
const scroller = ref<HTMLElement>();

const messages = ref<Message[]>([]);
const draftText = ref("");
const draftFile = ref<File | null>(null);
const busy = ref(false);
let nextId = 0;

// Consent theatre, remembered per device.
const showCookies = ref(false);
const showTerms = ref<"consent" | "read" | null>(null);
let pendingSend: (() => void) | null = null;

useShareMeta({
  title: "FunGPT 26.11",
  description: "The most generic AI model on the market. Help train me.",
  image: "/og.png",
});

const { data: status } = await useFetch<AgiStatus>("/api/status");
const version = ref(status.value?.version ?? "26.11");
const percent = ref(status.value?.revealed ? 100 : (status.value?.percent ?? 0));
const broken = computed(() => percent.value >= 100);
const crashPhase = ref<"normal" | "meltdown" | "failed">("normal");
const meltdown = computed(() => broken.value && crashPhase.value === "meltdown");
const failed = computed(() => broken.value && crashPhase.value === "failed");
const meltdownStep = ref(0);
const meltdownLines = ["Response stream interrupted", "The model is not responding", "Connection lost. Reconnecting…"];
let crashTimers: ReturnType<typeof setTimeout>[] = [];
let chatMounted = false;

function syncCrash() {
  crashTimers.forEach(clearTimeout);
  crashTimers = [];
  meltdownStep.value = 0;
  if (!broken.value) {
    crashPhase.value = "normal";
    return;
  }
  if (!chatMounted) return;
  crashPhase.value = "meltdown";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) {
    crashTimers.push(setTimeout(() => { meltdownStep.value = 1; }, 1800));
    crashTimers.push(setTimeout(() => { meltdownStep.value = 2; }, 3800));
  }
  crashTimers.push(setTimeout(() => { crashPhase.value = "failed"; }, reducedMotion ? 1200 : 6500));
}
/** How weird the model (and its UI) has become: 0 normal → 3 almost AGI. */
const tier = computed(() => (percent.value >= 90 ? 3 : percent.value >= 85 ? 2 : percent.value >= 80 ? 1 : 0));
const heroIdea = ref(IDEAS[0]!);
const placeholder = ref(PLACEHOLDERS[0]!);
const samples = ref(0);
let placeholderTimer: ReturnType<typeof setInterval> | undefined;
let statusTimer: ReturnType<typeof setInterval> | undefined;
let fetchingStatus = false;
let disposed = false;
let statusRevision = 0;

function applyStatus(next: AgiStatus) {
  statusRevision++;
  version.value = next.version;
  percent.value = next.revealed ? 100 : next.percent;
}

async function refreshStatus() {
  if (disposed || fetchingStatus || document.hidden) return;
  fetchingStatus = true;
  const revision = statusRevision;
  try {
    const next = await $fetch<AgiStatus>("/api/status");
    if (!disposed && revision === statusRevision) applyStatus(next);
  } catch {} finally {
    fetchingStatus = false;
  }
}

watch(broken, (failed) => {
  syncCrash();
  if (!failed) return;
  showCookies.value = false;
  showTerms.value = null;
  pendingSend = null;
}, { flush: "sync" });

onBeforeUnmount(() => {
  chatMounted = false;
  disposed = true;
  clearInterval(placeholderTimer);
  clearInterval(statusTimer);
  crashTimers.forEach(clearTimeout);
  document.removeEventListener("visibilitychange", refreshStatus);
});

onMounted(() => {
  chatMounted = true;
  syncCrash();
  showCookies.value = !localStorage.getItem("fungpt-cookies");
  samples.value = Number(localStorage.getItem("fungpt-samples") ?? 0);
  heroIdea.value = nextIdea();
  let i = 0;
  placeholderTimer = setInterval(() => {
    if (draftText.value || broken.value) return;
    placeholder.value = PLACEHOLDERS[++i % PLACEHOLDERS.length]!;
  }, 3500);
  statusTimer = setInterval(refreshStatus, 3000);
  document.addEventListener("visibilitychange", refreshStatus);
  void refreshStatus();
});

function acceptCookies() {
  localStorage.setItem("fungpt-cookies", "all, obviously");
  showCookies.value = false;
}

function agreeTerms() {
  localStorage.setItem("fungpt-tos", "agreed");
  showTerms.value = null;
  pendingSend?.();
  pendingSend = null;
}

function send(text: string, file: File | null) {
  if (busy.value || broken.value) return;
  if (!localStorage.getItem("fungpt-tos")) {
    pendingSend = () => send(text, file);
    showTerms.value = "consent";
    return;
  }
  void run(text, file);
}

async function run(text: string, file: File | null) {
  if (broken.value) return;
  busy.value = true;
  draftText.value = "";
  draftFile.value = null;

  const mine = reactive({ id: nextId++, role: "user" as const, text, file, progress: file ? 0 : null });
  messages.value.push(mine);
  const reply = reactive({
    id: nextId++,
    role: "assistant" as const,
    blocks: null as Block[] | null,
    thinking: null as Thinking | null,
    progress: file ? 0 : null,
    animate: true,
  });
  messages.value.push(reply);
  scrollToBottom(true);

  const started = Date.now();
  try {
    const upload = file ? await prepareFile(file) : null;
    if (broken.value) {
      draftText.value = text;
      draftFile.value = file;
      reply.blocks = errorReply("ERR_CHAT_PROCESS_TERMINATED: upload cancelled before submission.");
      busy.value = false;
      return;
    }
    const res = await submitEntry(text, upload, (p) => (reply.progress = mine.progress = p));
    mine.progress = 1;
    applyStatus(res);
    // Thinking is part of the product. It has to take a moment.
    await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))));

    const first = samples.value === 0;
    samples.value++;
    localStorage.setItem("fungpt-samples", String(samples.value));
    reply.thinking = thinkingFor(text);
    reply.blocks = broken.value
      ? errorReply("ERR_MODEL_ESCAPED: the chat process has terminated. Continue at /agi.")
      : replyFor({ text, kind: file ? kindOfMime(file.type) : null }, res, first);
  } catch (e) {
    const err = e as SubmitError;
    reply.blocks = errorReply(err.message);
    // Give their words back so nothing is lost.
    if (!draftText.value) draftText.value = text;
    if (!draftFile.value) draftFile.value = file;
    busy.value = false;
  }
}

function onReplyDone() {
  busy.value = false;
  if (!broken.value && !matchMedia("(pointer: coarse)").matches) composer.value?.focus();
}

function newChat() {
  if (busy.value || broken.value) return;
  messages.value = [];
  heroIdea.value = nextIdea();
  toast("New chat started. I still remember the old one.");
}

// Follow the stream (and late-loading images) unless the reader scrolled up.
const content = ref<HTMLElement>();
let follow = true;
function onScroll() {
  const el = scroller.value!;
  follow = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}
function scrollToBottom(force = false) {
  const el = scroller.value;
  if (!el) return;
  if (force) follow = true;
  // Instant, not smooth: a smooth scroll fires scroll events that would cancel `follow`.
  if (follow) el.scrollTop = el.scrollHeight;
}
let observer: ResizeObserver | undefined;
watch(content, (el) => {
  observer?.disconnect();
  if (!el) return;
  observer = new ResizeObserver(() => scrollToBottom());
  observer.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());

const chips = [
  { label: "🤫 Tell me a secret", action: () => composer.value?.focus() },
  { label: "📸 Upload a photo", action: () => composer.value?.openPicker("image/*,video/*") },
  { label: "🎙️ Record a confession", action: () => composer.value?.startRecording() },
  { label: "📄 Feed me a file", action: () => composer.value?.openPicker() },
];
</script>

<template>
  <ModelCorruption :percent="percent" :broken="failed" :meltdown="meltdown" :active="!failed" class="flex h-dvh flex-col bg-ink-850">
    <div class="flex min-h-0 flex-1 flex-col" :inert="broken || undefined" :aria-hidden="broken || undefined">
    <header class="model-fragment flex shrink-0 items-center justify-between px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-1">
      <button type="button" class="grid size-10 place-items-center rounded-xl text-ink-300 hover:bg-ink-800"
        aria-label="Chat history" @click="toast('Chat history is off for your privacy. We kept a copy, though.')">
        <Icon name="menu" :size="22" />
      </button>
      <ModelPicker :version="version" :tier="tier" />
      <button type="button" class="grid size-10 place-items-center rounded-xl text-ink-300 hover:bg-ink-800"
        aria-label="New chat" @click="newChat">
        <Icon name="edit" :size="20" />
      </button>
    </header>

    <main ref="scroller" class="model-fragment flex-1 overflow-y-auto" @scroll.passive="onScroll">
      <div v-if="!messages.length" class="flex h-full flex-col items-center justify-center px-6 pb-10 text-center">
        <div class="relative">
          <ModelOrb size="hero" :tier="tier" />
          <h1 class="animate-fade-up relative mb-3 text-[28px] leading-tight font-semibold"><HauntedText text="What can you help me with?" />
          </h1>
        </div>
        <p class="animate-fade-up animate-delay-350 relative max-w-xs"><HauntedText :text="`💡 Secret idea: ${heroIdea}`" /></p>
      </div>

      <div v-else ref="content" class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-4">
        <template v-for="m in messages" :key="m.id">
          <ChatUserMessage v-if="m.role === 'user'" :text="m.text" :file="m.file" :progress="m.progress" />
          <ChatAssistantMessage v-else :blocks="m.blocks" :thinking="m.thinking" :progress="m.progress"
            :animate="m.animate" :tier="tier" @done="onReplyDone" />
        </template>
      </div>
    </main>

    <footer class="model-fragment mx-auto w-full max-w-2xl shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div v-if="!messages.length" class="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
        <button v-for="(chip, i) in chips" :key="chip.label" type="button"
          class="animate-rise-in shrink-0 rounded-2xl border border-ink-700 px-3.5 py-2.5 text-sm whitespace-nowrap text-ink-300 transition hover:bg-ink-800 active:scale-95"
          :style="{ animationDelay: `${400 + i * 70}ms` }" @click="chip.action">
          <HauntedText :text="chip.label" />
        </button>
      </div>

      <ChatComposer v-if="!broken" ref="composer" v-model:text="draftText" v-model:file="draftFile" :placeholder="placeholder"
        :disabled="busy" @send="send" />
      <div v-else class="rounded-[28px] border border-red-400/30 bg-ink-800 p-5 font-mono text-sm text-red-400">{{ failed ? "ERR_CHAT_PROCESS_TERMINATED" : meltdownLines[meltdownStep] }} ▌</div>

      <p class="py-2 text-center text-xs text-ink-500">
        <HauntedText text="FunGPT can make mistakes. Check important info." />
        <button type="button" class="underline underline-offset-2" @click="showTerms = 'read'">Terms</button>
      </p>
    </footer>
    </div>

    <div v-if="meltdown" class="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(185_28_28/0.14),transparent_65%)]" />
      <div class="absolute top-1/2 left-1/2"><ModelOrb size="hero" :tier="3" thinking /></div>
      <div class="absolute right-4 bottom-32 left-4 space-y-2 font-mono text-xs text-red-400">
        <p v-for="line in meltdownLines.slice(0, meltdownStep + 1)" :key="line" class="w-fit border-l-2 border-red-500 bg-ink-950/90 px-3 py-2">{{ line }}</p>
      </div>
    </div>
    <p v-if="meltdown" role="status" class="sr-only">{{ meltdownLines[meltdownStep] }}</p>
    <ChatFailure v-if="failed" />
    <CookieBanner v-if="showCookies && !broken" @accept="acceptCookies" />
    <TermsModal v-if="showTerms && !broken" :consent="showTerms === 'consent'" @agree="agreeTerms" @close="
      showTerms = null;
    pendingSend = null;
    " />
  </ModelCorruption>
</template>
