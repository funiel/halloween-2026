<script setup lang="ts">
import type { Award, FeedItem } from "#shared/types/fungpt";

/** A revealed award in the feed's hall of fame. The finale is big and gold. */
defineProps<{ award: Award; byId: Map<string, FeedItem>; total: number }>();
</script>

<template>
  <article
    class="relative overflow-hidden rounded-3xl"
    :class="award.finale ? 'finale-card bg-gradient-to-b from-amber-300/25 to-amber-900/10 p-6' : 'bg-amber-300/10 p-4 ring-1 ring-amber-300/20'"
  >
    <div v-if="award.finale" class="rays pointer-events-none absolute -top-40 left-1/2 size-[480px] -translate-x-1/2 opacity-70" />

    <div class="relative" :class="award.finale && 'text-center'">
      <div class="font-mono text-[11px] tracking-[0.25em] text-amber-200/60">
        {{ award.finale ? "THE GRAND FINALE" : `AWARD ${award.place} OF ${total}` }}
      </div>
      <div :class="award.finale ? 'glow-pulse my-3 text-7xl' : 'mt-2 mb-1 flex items-center gap-2'">
        <span :class="!award.finale && 'text-3xl'">{{ award.emoji ?? "🏆" }}</span>
        <span v-if="!award.finale" class="gold-text text-xl font-extrabold">{{ award.title }}</span>
      </div>
      <h3 v-if="award.finale" class="gold-text mb-2 text-3xl leading-tight font-black">{{ award.title }}</h3>
      <div class="mb-3 font-mono text-xs text-white/50">
        {{ award.winners.length > 1 ? "shared by" : "goes to" }}
        {{ award.winners.length ? "" : "nobody. The model keeps this one." }}
        <template v-if="award.count">· {{ award.count }} {{ award.emoji ?? "reactions" }}</template>
      </div>
      <div class="space-y-2">
        <AwardWinner v-for="id in award.winners.slice(0, 3)" :key="id" :item="byId.get(id)" :big="award.finale" />
      </div>
    </div>
  </article>
</template>
