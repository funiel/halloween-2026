<script setup lang="ts">
import type { AwardCandidate, AwardResult, OperatorAward, OperatorEntry } from "#shared/types/fungpt";

const props = defineProps<{
  awards: OperatorAward[];
  revealed: number;
  candidates: AwardCandidate[];
  byId: Map<string, OperatorEntry>;
}>();
const emit = defineEmits<{ changed: [] }>();
const { toast } = useToast();

async function act(body: Record<string, unknown>) {
  try {
    await $fetch("/api/operator/awards", { method: "POST", body });
  } catch (e: any) {
    toast(e?.data?.statusMessage ?? "That didn't work");
  }
  emit("changed");
}

const next = computed(() => props.awards[props.revealed]);
const isFinaleNext = computed(() => props.revealed === props.awards.length - 1);

function revealNext() {
  const label = isFinaleNext.value ? "the GRAND FINALE" : `"${next.value!.title}"`;
  if (confirm(`Reveal ${label} on everyone's phone now?`)) void act({ action: "next" });
}
function undo() {
  if (confirm("Take back the last revealed award?")) void act({ action: "undo" });
}
function reset() {
  if (confirm("Reset the ceremony? All awards become unrevealed again.")) void act({ action: "reset" });
}

function winnerLine(r: AwardResult) {
  if (!r.winners.length) return "nobody yet";
  return r.winners
    .map((id) => {
      const e = props.byId.get(id);
      return `Human #${e?.handle ?? "?"}: ${e?.text ?? `📎 ${e?.file?.name ?? "hidden post"}`}`;
    })
    .join(" · ");
}

// ── Titles: typed locally, saved on blur, never overwritten by a refresh ──
const drafts = reactive<Record<string, string>>({});
function rename(a: OperatorAward) {
  const title = drafts[a.key]?.trim();
  delete drafts[a.key];
  if (title === undefined || title === a.title) return;
  void act({ action: "rename", key: a.key, title });
}

// ── Drag to reorder (only the awards that haven't been revealed) ──
const list = ref<OperatorAward[]>([]);
const rows: Record<string, HTMLElement> = {};
const drag = ref<{ key: string; lastY: number; offset: number } | null>(null);
const GAP = 8;

watch(
  () => props.awards,
  (awards) => {
    if (!drag.value) list.value = [...awards];
  },
  { immediate: true },
);

function startDrag(a: OperatorAward, e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  drag.value = { key: a.key, lastY: e.clientY, offset: 0 };
}

function moveDrag(e: PointerEvent) {
  const d = drag.value;
  if (!d) return;
  d.offset += e.clientY - d.lastY;
  d.lastY = e.clientY;

  // Swap with neighbours while we're more than halfway over them; the offset absorbs each jump.
  const items = list.value;
  for (;;) {
    const i = items.findIndex((a) => a.key === d.key);
    const below = items[i + 1];
    const above = items[i - 1];
    if (below && d.offset > rows[below.key]!.offsetHeight / 2) {
      d.offset -= rows[below.key]!.offsetHeight + GAP;
      items.splice(i, 2, below, items[i]!);
    } else if (above && i - 1 >= props.revealed && d.offset < -rows[above.key]!.offsetHeight / 2) {
      d.offset += rows[above.key]!.offsetHeight + GAP;
      items.splice(i - 1, 2, items[i]!, above);
    } else break;
  }
}

function endDrag() {
  if (!drag.value) return;
  drag.value = null;
  const order = list.value.map((a) => a.key);
  if (order.join() !== props.awards.map((a) => a.key).join()) {
    void act({ action: "order", keys: order.slice(props.revealed) });
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Ceremony controls -->
    <div class="rounded-2xl bg-amber-300/10 p-4 ring-1 ring-amber-300/30">
      <div class="mb-1 font-semibold text-amber-300">🏆 Ceremony</div>
      <template v-if="!awards.length">
        <p class="text-sm text-ink-300">Pick emojis below to turn them into awards. The last one in your list is the grand finale.</p>
      </template>
      <template v-else-if="next">
        <p class="mb-3 text-sm text-ink-300">
          Next up: <b class="text-ink-100">{{ next.emoji ?? "🏆" }} {{ next.title }}</b>
          <span class="block text-ink-500">Would go to {{ winnerLine(next.live) }}</span>
        </p>
        <button
          type="button"
          class="w-full rounded-2xl py-4 text-lg font-black text-black active:scale-[0.98]"
          :class="isFinaleNext ? 'bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200' : 'bg-amber-300'"
          @click="revealNext"
        >
          {{ isFinaleNext ? "✨ Reveal the GRAND FINALE ✨" : `Reveal award ${revealed + 1} of ${awards.length}` }}
        </button>
      </template>
      <p v-else class="text-sm text-ink-300">All {{ awards.length }} awards revealed. 🎉 Take a bow.</p>
      <div v-if="revealed" class="mt-3 flex gap-2 text-sm">
        <button type="button" class="flex-1 rounded-xl bg-ink-700 py-2" @click="undo">↩ Undo last</button>
        <button type="button" class="flex-1 rounded-xl bg-ink-700 py-2" @click="reset">Reset ceremony</button>
      </div>
    </div>

    <!-- Your awards, in ceremony order -->
    <div v-if="list.length">
      <div class="mb-2 text-sm font-semibold text-ink-300">Your awards <span class="font-normal text-ink-500">· drag ⠿ to reorder, tap a title to rename</span></div>
      <ol class="space-y-2">
        <li
          v-for="(a, i) in list"
          :key="a.key"
          :ref="(el) => el && (rows[a.key] = el as HTMLElement)"
          class="relative rounded-2xl p-3 transition-shadow"
          :class="[
            i === list.length - 1 ? 'bg-amber-300/15 ring-1 ring-amber-300/50' : 'bg-ink-800',
            drag?.key === a.key && 'z-10 shadow-2xl ring-2 ring-amber-300',
            i < revealed && 'opacity-60',
          ]"
          :style="drag?.key === a.key ? { transform: `translateY(${drag.offset}px) scale(1.02)` } : undefined"
        >
          <div class="flex items-center gap-2">
            <button
              v-if="i >= revealed"
              type="button"
              class="grid h-9 w-7 shrink-0 cursor-grab touch-none place-items-center text-lg text-ink-500 active:cursor-grabbing"
              aria-label="Drag to reorder"
              @pointerdown="startDrag(a, $event)"
              @pointermove="moveDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
            >
              ⠿
            </button>
            <span v-else class="w-7 shrink-0 text-center text-emerald-400">✓</span>
            <span class="text-2xl">{{ a.emoji ?? "🏆" }}</span>
            <input
              :value="drafts[a.key] ?? a.title"
              :placeholder="a.autoTitle"
              maxlength="60"
              enterkeyhint="done"
              class="min-w-0 flex-1 rounded-lg border-b border-dashed border-amber-300/40 bg-transparent px-1 py-0.5 font-semibold outline-none focus:border-solid focus:bg-black/20"
              @focus="drafts[a.key] = a.title"
              @input="drafts[a.key] = ($event.target as HTMLInputElement).value"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
              @blur="rename(a)"
            />
            <button
              v-if="i >= revealed"
              type="button"
              class="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-700"
              aria-label="Remove award"
              @click="act({ action: 'remove', key: a.key })"
            >
              <Icon name="x" :size="16" />
            </button>
          </div>
          <div class="mt-1 pl-9 text-xs text-ink-500">
            <span v-if="i === list.length - 1" class="mr-1 font-bold text-amber-300">GRAND FINALE ·</span>
            <template v-if="a.result">Won by {{ winnerLine(a.result) }} ({{ a.result.count }})</template>
            <template v-else>Leading: <span class="line-clamp-1 inline">{{ winnerLine(a.live) }}</span> ({{ a.live.count }})</template>
          </div>
        </li>
      </ol>
    </div>

    <!-- Everything that could become an award -->
    <div>
      <div class="mb-2 text-sm font-semibold text-ink-300">Pick awards <span class="font-normal text-ink-500">· what people reacted with</span></div>
      <p v-if="candidates.length <= 1 && !candidates[0]?.total" class="text-sm text-ink-500">No reactions yet. Once people react in the feed, every emoji they used shows up here.</p>
      <ul class="space-y-2">
        <li v-for="c in candidates.filter((c) => c.total)" :key="c.key" class="flex items-center gap-3 rounded-2xl bg-ink-800 p-3">
          <span class="w-9 text-center text-2xl">{{ c.emoji ?? "🏆" }}</span>
          <div class="min-w-0 flex-1 text-sm">
            <div class="font-semibold">{{ c.emoji ? `${c.total}× used` : `Most reactions overall (${c.total})` }}</div>
            <div class="line-clamp-1 text-xs text-ink-500">{{ winnerLine(c) }}</div>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold"
            :class="c.picked ? 'bg-ink-700 text-emerald-400' : 'bg-amber-300 text-black'"
            :disabled="c.picked"
            @click="act({ action: 'add', key: c.key })"
          >
            {{ c.picked ? "✓ Added" : "＋ Award" }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
