<script setup lang="ts">
/**
 * Scrambles through random characters, then settles left to right into the
 * real text (usually ████ bars) and gives a little "slam".
 */
const props = defineProps<{ text: string }>();

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*+=?/<>";
const out = ref(props.text);
const settled = ref(false);

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  out.value = props.text.replace(/\S/g, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!);
  const start = performance.now();
  const chars = [...props.text];
  const spread = Math.min(900, chars.length * 18);
  timer = setInterval(() => {
    const t = performance.now() - start;
    let done = true;
    out.value = chars
      .map((c, i) => {
        if (/\s/.test(c)) return c;
        if (t >= 250 + (i / chars.length) * spread) return c;
        done = false;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
      })
      .join("");
    if (done) {
      clearInterval(timer);
      settled.value = true;
    }
  }, 40);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <span class="inline-block origin-left" :class="settled ? 'animate-pop' : 'font-mono text-[0.92em] text-emerald-300/80'">{{ out }}</span>
</template>
