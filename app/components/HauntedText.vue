<script setup lang="ts">
import { hauntingKey } from "~/utils/corruption";

const props = defineProps<{ text: string }>();
const host = ref<HTMLElement>();
const words = computed(() => props.text.match(/\s+|\S+/g) ?? []);
const replacements = ref<Record<number, string>>({});
const register = inject(hauntingKey, undefined);
let unregister: (() => void) | undefined;

watch(() => props.text, () => { replacements.value = {}; });
onMounted(() => {
  unregister = register?.({
    words: () => words.value,
    visible: () => {
      const bounds = host.value?.getBoundingClientRect();
      return !!bounds && bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight;
    },
    replace: (next) => { replacements.value = next; },
  });
});
onBeforeUnmount(() => unregister?.());
</script>

<template>
  <span ref="host"><span class="sr-only">{{ text }}</span><span aria-hidden="true"><span v-for="(word, index) in words" :key="index" :class="replacements[index] && 'haunted-word'">{{ replacements[index] ?? word }}</span></span></span>
</template>
