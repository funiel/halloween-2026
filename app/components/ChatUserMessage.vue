<script setup lang="ts">
const props = defineProps<{ text: string; file: File | null; progress?: number | null }>();

const url = ref<string | null>(null);
onMounted(() => {
  if (props.file && /^(image|audio|video)\//.test(props.file.type)) url.value = URL.createObjectURL(props.file);
});
onBeforeUnmount(() => url.value && URL.revokeObjectURL(url.value));

const kind = computed(() => (props.file ? kindOfMime(props.file.type) : null));
const uploading = computed(() => props.progress != null && props.progress < 1);

// Circular progress ring
const R = 18;
const CIRC = 2 * Math.PI * R;
const dash = computed(() => CIRC * (1 - (props.progress ?? 0)));
</script>

<template>
  <div class="animate-send-up flex origin-bottom-right flex-col items-end gap-2">
    <template v-if="file">
      <div class="relative overflow-hidden rounded-3xl" :class="kind === 'audio' || kind === 'file' ? 'max-w-[85%]' : 'max-w-[75%]'">
        <img v-if="kind === 'image' && url" :src="url" alt="" class="max-h-72 object-cover transition duration-500" :class="uploading && 'scale-105 blur-[2px] brightness-75'" />
        <audio v-else-if="kind === 'audio' && url" :src="url" controls class="max-w-full" />
        <video v-else-if="kind === 'video' && url" :src="url" controls playsinline class="max-h-72" />
        <div v-else class="flex items-center gap-3 rounded-2xl border border-ink-700 p-2 pr-4">
          <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ff5588] text-white">
            <Icon name="file" />
          </div>
          <div class="min-w-0 text-sm">
            <div class="truncate font-medium">{{ file.name }}</div>
            <div class="text-ink-500">{{ formatBytes(file.size) }}</div>
          </div>
        </div>

        <!-- Upload ring -->
        <Transition leave-active-class="transition duration-500" leave-to-class="opacity-0 scale-125">
          <div v-if="uploading" class="absolute inset-0 grid place-items-center bg-black/25">
            <svg viewBox="0 0 44 44" class="size-14 -rotate-90 drop-shadow-lg">
              <circle cx="22" cy="22" :r="R" fill="rgb(0 0 0 / 0.45)" stroke="rgb(255 255 255 / 0.2)" stroke-width="3" />
              <circle
                cx="22"
                cy="22"
                :r="R"
                fill="none"
                stroke="white"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="CIRC"
                :stroke-dashoffset="dash"
                class="transition-[stroke-dashoffset] duration-200"
              />
            </svg>
            <span class="absolute font-mono text-[11px] font-semibold text-white tabular-nums">{{ Math.round((progress ?? 0) * 100) }}</span>
          </div>
        </Transition>
      </div>
    </template>
    <div v-if="text" class="max-w-[85%] rounded-3xl bg-ink-800 px-4 py-2.5 text-[16px] leading-7 whitespace-pre-wrap break-words">
      {{ text }}
    </div>
  </div>
</template>
