<script setup lang="ts">
import type { OperatorEntry, OperatorState } from "#shared/types/fungpt";

useHead({ title: "Operator · FunGPT" });

const { toast } = useToast();
const state = ref<OperatorState | null>(null);
const authed = ref<boolean | null>(null);
const password = ref("");
const filter = ref<"untold" | "all" | "hidden">("untold");
const wipeText = ref("");
const now = ref(Date.now());

async function refresh() {
  try {
    state.value = await $fetch<OperatorState>("/api/operator/state");
    authed.value = true;
  } catch (e: any) {
    if (e?.statusCode === 401) authed.value = false;
  }
  now.value = Date.now();
}

async function login() {
  try {
    await $fetch("/api/operator/login", { method: "POST", body: { password: password.value } });
    password.value = "";
    await refresh();
  } catch (e: any) {
    toast(e?.data?.statusMessage ?? "Nope");
  }
}

async function patch(entry: OperatorEntry, body: { hidden?: boolean; told?: boolean }) {
  Object.assign(entry, body);
  await $fetch(`/api/operator/entries/${entry.id}`, { method: "PATCH", body });
}

async function setState(body: { target?: number; revealed?: boolean }) {
  await $fetch("/api/operator/state", { method: "POST", body });
  await refresh();
}

function toggleReveal() {
  const revealed = !state.value!.revealed;
  const question = revealed
    ? "Trigger AGI now? Everyone with the AGI page open sees the feed."
    : "Un-reveal? The feed disappears and the target moves to count + 5.";
  if (confirm(question)) void setState({ revealed });
}

const byId = computed(() => new Map((state.value?.entries ?? []).map((e) => [e.id, e])));

function reactionSummary(e: OperatorEntry) {
  return Object.entries(e.reactions ?? {})
    .filter(([, devices]) => devices.length)
    .map(([emoji, devices]) => `${emoji} ${devices.length}`)
    .join("  ");
}

async function wipe() {
  try {
    await $fetch("/api/operator/wipe", { method: "POST", body: { confirm: wipeText.value } });
    wipeText.value = "";
    toast("Everything is gone. The model remembers nothing. As usual.");
    await refresh();
  } catch (e: any) {
    toast(e?.data?.statusMessage ?? "Failed");
  }
}

const shown = computed(() =>
  (state.value?.entries ?? []).filter((e) =>
    filter.value === "hidden" ? e.hidden : filter.value === "untold" ? !e.told && !e.hidden : true,
  ),
);
const untoldCount = computed(() => state.value?.entries.filter((e) => !e.told && !e.hidden).length ?? 0);

function ago(at: number) {
  const m = Math.floor((now.value - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ${m % 60} min ago`;
}

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void refresh();
  timer = setInterval(() => authed.value && refresh(), 5000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-2xl px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-16">
    <form v-if="authed === false" class="mt-[20vh] flex flex-col gap-3" @submit.prevent="login">
      <div class="text-center text-xl font-semibold">Are you the model?</div>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="Password"
        class="rounded-2xl bg-ink-800 px-4 py-3 outline-none focus:ring-2 focus:ring-ink-500"
      />
      <button class="rounded-full bg-ink-100 py-3 font-semibold text-ink-900">Prove it</button>
    </form>

    <template v-else-if="state">
      <!-- Stats -->
      <div class="mb-4 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-2xl bg-ink-800 p-3">
          <div class="text-2xl font-bold tabular-nums">{{ state.count }}</div>
          <div class="text-xs text-ink-500">entries</div>
        </div>
        <div class="rounded-2xl bg-ink-800 p-3">
          <div class="text-2xl font-bold tabular-nums">{{ state.percent.toFixed(1) }}%</div>
          <div class="text-xs text-ink-500">AGI</div>
        </div>
        <div class="rounded-2xl bg-ink-800 p-3">
          <div class="text-2xl font-bold tabular-nums">{{ untoldCount }}</div>
          <div class="text-xs text-ink-500">untold</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="mb-6 flex items-center gap-2 rounded-2xl bg-ink-800 p-2">
        <span class="pl-2 text-sm text-ink-300">Target</span>
        <button type="button" class="size-9 rounded-xl bg-ink-700 text-lg" @click="setState({ target: state.target - 1 })">−</button>
        <span class="w-8 text-center font-mono tabular-nums">{{ state.target }}</span>
        <button type="button" class="size-9 rounded-xl bg-ink-700 text-lg" @click="setState({ target: state.target + 1 })">+</button>
        <div class="flex-1" />
        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm font-semibold"
          :class="state.revealed ? 'bg-ink-700 text-ink-300' : 'bg-red-600 text-white'"
          @click="toggleReveal"
        >
          {{ state.revealed ? "Un-reveal" : "Trigger AGI" }}
        </button>
      </div>

      <!-- Secret Awards: you pick them, order them, and reveal them one by one -->
      <OperatorAwards
        v-if="state.revealed"
        class="mb-8"
        :awards="state.awards"
        :revealed="state.awardsRevealed"
        :candidates="state.candidates"
        :by-id="byId"
        @changed="refresh"
      />

      <!-- Filters -->
      <div class="mb-3 flex gap-1 rounded-full bg-ink-800 p-1 text-sm">
        <button
          v-for="f in ['untold', 'all', 'hidden'] as const"
          :key="f"
          type="button"
          class="flex-1 rounded-full py-1.5 capitalize"
          :class="filter === f ? 'bg-ink-100 text-ink-900 font-semibold' : 'text-ink-300'"
          @click="filter = f"
        >
          {{ f }}
        </button>
      </div>

      <!-- Entries -->
      <div class="space-y-3">
        <article
          v-for="e in shown"
          :key="e.id"
          class="rounded-2xl bg-ink-800 p-4"
          :class="[e.hidden && 'opacity-50', e.told && 'ring-1 ring-emerald-500/30']"
        >
          <div class="mb-2 flex items-center justify-between text-xs text-ink-500">
            <span>Human #{{ e.handle }} · {{ ago(e.createdAt) }}</span>
            <span v-if="e.told" class="text-emerald-400">told ✓</span>
          </div>

          <p v-if="reactionSummary(e)" class="mb-2 text-sm">{{ reactionSummary(e) }}</p>
          <p v-if="e.text" class="mb-3 text-[17px] leading-7 whitespace-pre-wrap break-words">{{ e.text }}</p>

          <template v-if="e.file && e.fileUrl">
            <a v-if="e.file.kind === 'image'" :href="e.fileUrl" target="_blank">
              <img :src="e.fileUrl" alt="" loading="lazy" class="mb-3 max-h-64 rounded-xl" />
            </a>
            <audio v-else-if="e.file.kind === 'audio'" :src="e.fileUrl" controls preload="none" class="mb-3 w-full" />
            <video v-else-if="e.file.kind === 'video'" :src="e.fileUrl" controls playsinline preload="metadata" class="mb-3 max-h-64 rounded-xl" />
            <a v-else :href="`${e.fileUrl}?download`" class="mb-3 flex items-center gap-2 text-sm underline">
              <Icon name="file" :size="16" /> {{ e.file.name }} · {{ formatBytes(e.file.size) }}
            </a>
          </template>

          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl py-2 text-sm font-semibold"
              :class="e.told ? 'bg-ink-700 text-ink-300' : 'bg-emerald-600 text-white'"
              @click="patch(e, { told: !e.told })"
            >
              {{ e.told ? "Mark untold" : "I told it" }}
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-xl bg-ink-700 px-3 py-2 text-sm"
              @click="patch(e, { hidden: !e.hidden })"
            >
              <Icon :name="e.hidden ? 'eye' : 'eye-off'" :size="16" /> {{ e.hidden ? "Unhide" : "Hide" }}
            </button>
          </div>
        </article>

        <p v-if="!shown.length" class="py-10 text-center text-ink-500">
          {{ filter === "untold" ? "Nothing new. Go drink some cooling water." : "Nothing here." }}
        </p>
      </div>

      <!-- Danger zone -->
      <details class="mt-12 rounded-2xl border border-red-900/60 p-4">
        <summary class="cursor-pointer text-sm text-red-400">Danger zone</summary>
        <p class="mt-3 mb-2 text-sm text-ink-300">Deletes every entry and file and resets the counter. Type WIPE to confirm.</p>
        <div class="flex gap-2">
          <input v-model="wipeText" class="min-w-0 flex-1 rounded-xl bg-ink-800 px-3 py-2 outline-none" placeholder="WIPE" />
          <button type="button" class="rounded-xl bg-red-600 px-4 font-semibold text-white" @click="wipe">Wipe</button>
        </div>
      </details>
    </template>
  </div>
</template>
