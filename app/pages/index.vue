<script setup lang="ts">
import type { AgiStatus } from "#shared/types/fungpt";
import type { Block, Thinking } from "~/utils/replies";
import type ChatComposer from "~/components/ChatComposer.vue";

type Message =
  | { id: number; role: "user"; text: string; file: File | null }
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

const FORGET_AFTER_MS = 10 * 60_000;

const { data: status } = await useFetch<AgiStatus>("/api/status");
const version = ref(status.value?.version ?? "26.11");
const heroIdea = ref(IDEAS[0]!);
/** "Welcome back" within ten minutes, "Have we met?" after that. Like the costume. */
const greeting = ref<string | null>(null);
const placeholder = ref(PLACEHOLDERS[0]!);
const samples = ref(0);
let placeholderTimer: ReturnType<typeof setInterval> | undefined;
onBeforeUnmount(() => clearInterval(placeholderTimer));

onMounted(() => {
  showCookies.value = !localStorage.getItem("fungpt-cookies");
  samples.value = Number(localStorage.getItem("fungpt-samples") ?? 0);
  heroIdea.value = nextIdea();
  const lastSeen = Number(localStorage.getItem("fungpt-last-seen") ?? 0);
  const lastSecret = localStorage.getItem("fungpt-last-redacted");
  if (lastSeen && Date.now() - lastSeen < FORGET_AFTER_MS) {
    greeting.value = lastSecret
      ? `Welcome back! As you mentioned earlier: "${lastSecret}"`
      : "Welcome back! I remember you. Vaguely.";
  } else if (lastSeen) {
    greeting.value = "Hi! I'm FunGPT. Have we met? I'm terrible with faces.";
  }
  let i = 0;
  placeholderTimer = setInterval(() => {
    if (draftText.value) return;
    placeholder.value = PLACEHOLDERS[++i % PLACEHOLDERS.length]!;
  }, 3500);
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
  if (busy.value) return;
  if (!localStorage.getItem("fungpt-tos")) {
    pendingSend = () => send(text, file);
    showTerms.value = "consent";
    return;
  }
  void run(text, file);
}

async function run(text: string, file: File | null) {
  busy.value = true;
  draftText.value = "";
  draftFile.value = null;

  messages.value.push({ id: nextId++, role: "user", text, file });
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
    const res = await submitEntry(text, upload, (p) => (reply.progress = p));
    // Thinking is part of the product. It has to take a moment.
    await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))));

    const first = samples.value === 0;
    samples.value++;
    version.value = res.version;
    localStorage.setItem("fungpt-samples", String(samples.value));
    localStorage.setItem("fungpt-last-seen", String(Date.now()));
    // Only ever keep the redacted version on the phone, in case someone borrows it.
    if (text.length >= 12) localStorage.setItem("fungpt-last-redacted", redact(text));
    reply.thinking = thinkingFor(text);
    reply.blocks = replyFor({ text, kind: file ? kindOfMime(file.type) : null }, res, first);
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
  if (!matchMedia("(pointer: coarse)").matches) composer.value?.focus();
}

function newChat() {
  if (busy.value) return;
  messages.value = [];
  heroIdea.value = nextIdea();
  greeting.value = null;
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
  <div class="flex h-dvh flex-col bg-ink-850">
    <header class="flex shrink-0 items-center justify-between px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-1">
      <button
        type="button"
        class="grid size-10 place-items-center rounded-xl text-ink-300 hover:bg-ink-800"
        aria-label="Chat history"
        @click="toast('Chat history is off for your privacy. We kept a copy, though.')"
      >
        <Icon name="menu" :size="22" />
      </button>
      <ModelPicker :version="version" />
      <button type="button" class="grid size-10 place-items-center rounded-xl text-ink-300 hover:bg-ink-800" aria-label="New chat" @click="newChat">
        <Icon name="edit" :size="20" />
      </button>
    </header>

    <main ref="scroller" class="flex-1 overflow-y-auto" @scroll.passive="onScroll">
      <div v-if="!messages.length" class="flex h-full flex-col items-center justify-center px-6 pb-10 text-center">
        <h1 class="mb-3 text-[28px] leading-tight font-semibold">What can you help me with?</h1>
        <p v-if="greeting" class="redacted mb-3 max-w-xs text-ink-300">{{ greeting }}</p>
        <p class="max-w-xs text-ink-500">💡 Secret idea: {{ heroIdea }}</p>
      </div>

      <div v-else ref="content" class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-4">
        <template v-for="m in messages" :key="m.id">
          <ChatUserMessage v-if="m.role === 'user'" :text="m.text" :file="m.file" />
          <ChatAssistantMessage
            v-else
            :blocks="m.blocks"
            :thinking="m.thinking"
            :progress="m.progress"
            :animate="m.animate"
            @done="onReplyDone"
          />
        </template>
      </div>
    </main>

    <footer class="mx-auto w-full max-w-2xl shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div v-if="!messages.length" class="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
        <button
          v-for="chip in chips"
          :key="chip.label"
          type="button"
          class="shrink-0 rounded-2xl border border-ink-700 px-3.5 py-2.5 text-sm whitespace-nowrap text-ink-300 hover:bg-ink-800"
          @click="chip.action"
        >
          {{ chip.label }}
        </button>
      </div>

      <ChatComposer
        ref="composer"
        v-model:text="draftText"
        v-model:file="draftFile"
        :placeholder="placeholder"
        :disabled="busy"
        @send="send"
      />

      <p class="py-2 text-center text-xs text-ink-500">
        FunGPT can make mistakes. Check important info.
        <button type="button" class="underline underline-offset-2" @click="showTerms = 'read'">Terms</button>
      </p>
    </footer>

    <CookieBanner v-if="showCookies" @accept="acceptCookies" />
    <TermsModal
      v-if="showTerms"
      :consent="showTerms === 'consent'"
      @agree="agreeTerms"
      @close="
        showTerms = null;
        pendingSend = null;
      "
    />
  </div>
</template>
