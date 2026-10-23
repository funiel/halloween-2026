<script setup lang="ts">
import type { FeedItem } from "#shared/types/fungpt";
// Bundled with the app, so the picker never fetches emoji data from a CDN.
import emojiData from "emoji-picker-element-data/en/emojibase/data.json?url";

const props = defineProps<{ item: FeedItem; index: number }>();
const emit = defineEmits<{ zoom: [url: string]; react: [emoji: string] }>();

const hue = computed(() => (props.item.handle * 47) % 360);

const QUICK = ["😂", "😱", "💀", "🤫", "🥹", "🔥", "👀", "🤖"];
const picking = ref(false);
const pickerLoaded = ref(false);

function react(emoji: string) {
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
</script>

<template>
  <article
    class="rise-in rounded-3xl border border-white/8 bg-white/[0.03] p-4"
    :style="{ animationDelay: `${Math.min(index, 12) * 70}ms` }"
  >
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

    <p v-if="item.text" class="mb-3 text-[17px] leading-7 whitespace-pre-wrap break-words">{{ item.text }}</p>

    <template v-if="item.file">
      <button
        v-if="item.file.kind === 'image'"
        type="button"
        class="mb-1 block w-full overflow-hidden rounded-2xl bg-black"
        @click="emit('zoom', item.file.url)"
      >
        <img :src="item.file.url" :alt="item.file.name" loading="lazy" class="max-h-[70vh] w-full object-contain" />
      </button>

      <audio v-else-if="item.file.kind === 'audio'" :src="item.file.url" controls preload="metadata" class="mb-1 w-full" />

      <video
        v-else-if="item.file.kind === 'video'"
        :src="item.file.url"
        controls
        playsinline
        preload="metadata"
        class="mb-1 max-h-[70vh] w-full rounded-2xl bg-black"
      />

      <a
        v-else
        :href="`${item.file.url}?download`"
        download
        class="mb-1 flex items-center gap-3 rounded-2xl bg-white/5 p-3 hover:bg-white/10"
      >
        <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ff5588] text-white">
          <Icon name="file" />
        </div>
        <div class="min-w-0 flex-1 text-sm">
          <div class="truncate font-medium">{{ item.file.name }}</div>
          <div class="text-white/40">{{ formatBytes(item.file.size) }}</div>
        </div>
        <Icon name="download" class="text-white/60" />
      </a>
    </template>

    <p class="mt-3 text-sm leading-5 italic" :class="item.told ? 'text-amber-300/80' : 'text-white/45'">
      {{ takeFor(item) }}
    </p>

    <!-- Reactions -->
    <div class="mt-3 flex flex-wrap items-center gap-1.5 font-sans">
      <button
        v-for="r in item.reactions"
        :key="r.emoji"
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm tabular-nums transition"
        :class="r.mine ? 'border-sky-400/60 bg-sky-400/15 text-white' : 'border-white/10 bg-white/5 text-white/70'"
        @click="react(r.emoji)"
      >
        <span class="text-base leading-none">{{ r.emoji }}</span>{{ r.count }}
      </button>
      <button
        type="button"
        class="grid h-8 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60"
        aria-label="Add reaction"
        @click="togglePicker"
      >
        <span class="text-sm">＋😀</span>
      </button>
    </div>

    <div v-if="picking" class="mt-2 rounded-2xl bg-white/5 p-2 font-sans">
      <div class="flex justify-between">
        <button
          v-for="e in QUICK"
          :key="e"
          type="button"
          class="grid size-9 place-items-center rounded-xl text-xl hover:bg-white/10 active:scale-90"
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
