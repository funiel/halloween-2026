<script setup lang="ts">
const props = defineProps<{ disabled?: boolean; placeholder: string }>();
const emit = defineEmits<{ send: [text: string, file: File | null] }>();

const text = defineModel<string>("text", { default: "" });
const file = defineModel<File | null>("file", { default: null });

const { toast } = useToast();
const textarea = ref<HTMLTextAreaElement>();
const picker = ref<HTMLInputElement>();
const accept = ref("*/*");

const previewUrl = ref<string | null>(null);
watch(file, (f, _, onCleanup) => {
  previewUrl.value = f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
  const url = previewUrl.value;
  onCleanup(() => url && URL.revokeObjectURL(url));
});

const recorder = useRecorder((f) => {
  file.value = f;
  nextTick(() => textarea.value?.focus());
});

const canSend = computed(() => !props.disabled && !recorder.recording.value && (!!text.value.trim() || !!file.value));

function resize() {
  const el = textarea.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}
watch(text, () => nextTick(resize));

function send() {
  if (!canSend.value) return;
  emit("send", text.value.trim(), file.value);
}

function onKeydown(e: KeyboardEvent) {
  // Phones get newlines; keyboards get Enter-to-send.
  const touch = matchMedia("(pointer: coarse)").matches;
  if (e.key === "Enter" && !e.shiftKey && !touch && !e.isComposing) {
    e.preventDefault();
    send();
  }
}

function openPicker(type = "*/*") {
  accept.value = type;
  nextTick(() => picker.value?.click());
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  const picked = input.files?.[0];
  input.value = "";
  if (!picked) return;
  if (picked.size > 30 * 1024 * 1024) {
    toast("That file is over 30 MB. Even I have limits.");
    return;
  }
  file.value = picked;
}

async function startRecording() {
  if (!recorder.supported.value) {
    toast("Your browser won't let me listen. Rude, but fair.");
    return;
  }
  try {
    await recorder.start();
  } catch {
    toast("Microphone access denied. I'll just guess what you were going to say.");
  }
}

function focus() {
  textarea.value?.focus();
}

defineExpose({ openPicker, startRecording, focus });

const time = computed(() => {
  const s = recorder.seconds.value;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
});
</script>

<template>
  <div
    class="rounded-[28px] bg-ink-800 p-2 shadow-[0_0_0_1px_rgb(255_255_255/0.04)] transition-shadow duration-300 focus-within:shadow-[0_0_0_1px_rgb(255_255_255/0.1),0_0_28px_rgb(129_140_248/0.14)]"
  >
    <input ref="picker" type="file" class="hidden" :accept="accept" @change="onPick" />

    <!-- Attachment chip -->
    <div v-if="file" class="flex px-1 pt-1 pb-2">
      <div class="animate-send-up relative flex max-w-full items-center gap-3 rounded-2xl bg-ink-700/60 p-2 pr-9">
        <img v-if="previewUrl" :src="previewUrl" alt="" class="size-12 rounded-xl object-cover" />
        <div v-else class="grid size-12 shrink-0 place-items-center rounded-xl bg-[#ff5588] text-white">
          <Icon :name="file.type.startsWith('audio/') ? 'mic' : 'file'" :size="22" />
        </div>
        <div class="min-w-0 text-sm">
          <div class="truncate font-medium">{{ file.name }}</div>
          <div class="text-ink-500">{{ formatBytes(file.size) }}</div>
        </div>
        <button
          type="button"
          class="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink-100 text-ink-900"
          aria-label="Remove attachment"
          @click="file = null"
        >
          <Icon name="x" :size="14" />
        </button>
      </div>
    </div>

    <!-- Recording -->
    <div v-if="recorder.recording.value" class="flex h-[52px] items-center gap-3 px-2">
      <button
        type="button"
        class="grid size-9 place-items-center rounded-full text-ink-300 hover:bg-ink-700"
        aria-label="Cancel recording"
        @click="recorder.cancel()"
      >
        <Icon name="x" />
      </button>
      <div class="flex h-9 flex-1 items-center justify-end gap-[3px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_35%)]">
        <span
          v-for="(level, i) in recorder.levels.value"
          :key="i"
          class="w-1 shrink-0 rounded-full bg-linear-to-t from-red-400 via-rose-200 to-ink-100 transition-[height] duration-100 ease-out"
          :style="{ height: `${Math.max(14, level * 100)}%` }"
        />
      </div>
      <span class="w-10 text-right font-mono text-sm tabular-nums text-ink-300">{{ time }}</span>
      <!-- Live: a red mic with a pulsing ring -->
      <span class="relative grid size-9 shrink-0 place-items-center">
        <span class="animate-rec-ping absolute inset-0 rounded-full bg-red-500/60" />
        <span class="animate-rec-ping absolute inset-0 rounded-full bg-red-500/40 [animation-delay:0.7s]" />
        <span class="relative grid size-9 place-items-center rounded-full bg-red-500 text-white shadow-[0_0_16px_rgb(239_68_68/0.6)]">
          <Icon name="mic" :size="18" />
        </span>
      </span>
      <button
        type="button"
        class="grid size-9 place-items-center rounded-full bg-ink-100 text-ink-900 transition active:scale-90"
        aria-label="Finish recording"
        @click="recorder.stop()"
      >
        <Icon name="check" />
      </button>
    </div>

    <template v-else>
      <textarea
        ref="textarea"
        v-model="text"
        rows="1"
        :placeholder="placeholder"
        maxlength="5000"
        class="block max-h-[200px] w-full resize-none bg-transparent px-3 pt-2 pb-1 text-base leading-6 text-ink-100 placeholder:text-ink-500 focus:outline-none"
        @keydown="onKeydown"
      />
      <div class="flex items-center gap-1 pt-1">
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full text-ink-100 transition hover:bg-ink-700 active:scale-90"
          aria-label="Attach a file"
          @click="openPicker()"
        >
          <Icon name="plus" :size="22" />
        </button>
        <div class="flex-1" />
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full text-ink-100 transition hover:bg-ink-700 active:scale-90"
          aria-label="Record a voice note"
          @click="startRecording"
        >
          <Icon name="mic" />
        </button>
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full transition duration-200 active:scale-90"
          :class="canSend ? 'scale-100 bg-ink-100 text-ink-900' : 'scale-90 bg-ink-700 text-ink-500'"
          :disabled="!canSend"
          aria-label="Send"
          @click="send"
        >
          <Icon name="arrow-up" />
        </button>
      </div>
    </template>
  </div>
</template>
