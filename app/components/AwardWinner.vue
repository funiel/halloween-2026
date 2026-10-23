<script setup lang="ts">
import type { FeedItem } from "#shared/types/fungpt";

/** The winning post, compact. `big` for the finale. */
defineProps<{ item?: FeedItem; big?: boolean }>();
</script>

<template>
  <div class="rounded-2xl bg-black/50 text-left ring-1 ring-white/10" :class="big ? 'p-5' : 'p-4'">
    <div class="mb-1.5 font-mono text-xs text-amber-200/70">Human #{{ item?.handle ?? "????" }}</div>
    <p
      v-if="item?.text"
      class="whitespace-pre-wrap break-words text-white"
      :class="big ? 'line-clamp-[8] text-xl leading-8' : 'line-clamp-5 text-[16px] leading-7'"
    >
      {{ item.text }}
    </p>
    <img
      v-if="item?.file?.kind === 'image'"
      :src="item.file.url"
      alt=""
      class="mt-3 w-full rounded-xl object-cover"
      :class="big ? 'max-h-72' : 'max-h-44'"
    />
    <p v-else-if="item?.file" class="mt-2 text-sm text-white/60">📎 {{ item.file.name }}</p>
    <p v-if="!item" class="text-white/60">A post that has since been hidden. Mysterious.</p>
  </div>
</template>
