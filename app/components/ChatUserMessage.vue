<script setup lang="ts">
const props = defineProps<{ text: string; file: File | null }>();

const url = ref<string | null>(null);
onMounted(() => {
  if (props.file && /^(image|audio|video)\//.test(props.file.type)) url.value = URL.createObjectURL(props.file);
});
onBeforeUnmount(() => url.value && URL.revokeObjectURL(url.value));

const kind = computed(() => (props.file ? kindOfMime(props.file.type) : null));
</script>

<template>
  <div class="flex flex-col items-end gap-2">
    <template v-if="file">
      <img v-if="kind === 'image' && url" :src="url" alt="" class="max-h-72 max-w-[75%] rounded-3xl object-cover" />
      <audio v-else-if="kind === 'audio' && url" :src="url" controls class="max-w-[85%]" />
      <video v-else-if="kind === 'video' && url" :src="url" controls playsinline class="max-h-72 max-w-[75%] rounded-3xl" />
      <div v-else class="flex max-w-[85%] items-center gap-3 rounded-2xl border border-ink-700 p-2 pr-4">
        <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ff5588] text-white">
          <Icon name="file" />
        </div>
        <div class="min-w-0 text-sm">
          <div class="truncate font-medium">{{ file.name }}</div>
          <div class="text-ink-500">{{ formatBytes(file.size) }}</div>
        </div>
      </div>
    </template>
    <div v-if="text" class="max-w-[85%] rounded-3xl bg-ink-800 px-4 py-2.5 text-[16px] leading-7 whitespace-pre-wrap break-words">
      {{ text }}
    </div>
  </div>
</template>
