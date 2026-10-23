<script setup lang="ts">
import type { FeedItem } from "#shared/types/fungpt";

const props = defineProps<{ item: FeedItem; index: number }>();
const emit = defineEmits<{ zoom: [url: string] }>();

const hue = computed(() => (props.item.handle * 47) % 360);
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

    <div v-if="item.told" class="mt-3 font-mono text-xs text-amber-300/80">
      ↻ The model already told this story as its own.
    </div>
  </article>
</template>
