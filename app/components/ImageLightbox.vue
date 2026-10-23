<script setup lang="ts">
/**
 * Full-screen photo that grows out of its thumbnail (and shrinks back into
 * it). Pinch or double-tap to zoom, drag to pan, tap to close.
 */
const props = defineProps<{ src: string; from: DOMRect }>();
const emit = defineEmits<{ close: [] }>();

const img = ref<HTMLImageElement>();
const backdrop = ref<HTMLElement>();
const box = ref({ left: 0, top: 0, width: 0, height: 0 });
const view = reactive({ scale: 1, x: 0, y: 0 });
const ready = ref(false);
/** A finger is down: follow it 1:1, no smoothing. */
const touching = ref(false);
let closing = false;

/** Where the photo sits when it fits the screen. */
function fitted(natW: number, natH: number) {
  const pad = 8;
  const s = Math.min((innerWidth - pad * 2) / natW, (innerHeight - pad * 2) / natH);
  const width = natW * s;
  const height = natH * s;
  return { left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, width, height };
}

/** Transform that makes the fitted photo look like the thumbnail. */
function fromTransform() {
  const b = box.value;
  const f = props.from;
  return `translate(${f.left - b.left}px, ${f.top - b.top}px) scale(${f.width / b.width}, ${f.height / b.height})`;
}

onMounted(async () => {
  document.body.style.overflow = "hidden";
  const el = img.value!;
  await el.decode().catch(() => {});
  box.value = fitted(el.naturalWidth || props.from.width, el.naturalHeight || props.from.height);
  await nextTick();
  ready.value = true;
  el.animate([{ transform: fromTransform(), borderRadius: "16px" }, { transform: "none", borderRadius: "0px" }], {
    duration: 380,
    easing: "cubic-bezier(0.2, 0.9, 0.3, 1)",
  });
  backdrop.value!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
});
onBeforeUnmount(() => (document.body.style.overflow = ""));

async function close() {
  if (closing) return;
  closing = true;
  Object.assign(view, { scale: 1, x: 0, y: 0 });
  backdrop.value!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: "forwards" });
  await img.value!.animate([{ transform: "none" }, { transform: fromTransform(), borderRadius: "16px" }], {
    duration: 300,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    fill: "forwards",
  }).finished;
  emit("close");
}

// ── Gestures ──
const pointers = new Map<number, { x: number; y: number }>();
let pinch: { dist: number; scale: number } | null = null;
let drag: { x: number; y: number; vx: number; vy: number } | null = null;
let moved = false;
let lastTap = 0;

const distance = () => {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a!.x - b!.x, a!.y - b!.y);
};

function down(e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  touching.value = true;
  moved = false;
  if (pointers.size === 2) pinch = { dist: distance(), scale: view.scale };
  else drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
}

function move(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    view.scale = Math.min(5, Math.max(1, pinch.scale * (distance() / pinch.dist)));
    moved = true;
  } else if (drag && view.scale > 1) {
    view.x = drag.vx + (e.clientX - drag.x);
    view.y = drag.vy + (e.clientY - drag.y);
    moved = true;
  }
}

function up(e: PointerEvent) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size) return;
  touching.value = false;
  drag = null;
  if (view.scale <= 1.02) Object.assign(view, { scale: 1, x: 0, y: 0 });
  if (moved) return;

  // Double tap zooms in/out around the finger; a single tap closes.
  const now = Date.now();
  if (now - lastTap < 280) {
    lastTap = 0;
    if (view.scale > 1) Object.assign(view, { scale: 1, x: 0, y: 0 });
    else Object.assign(view, { scale: 2.5, x: (innerWidth / 2 - e.clientX) * 1.5, y: (innerHeight / 2 - e.clientY) * 1.5 });
    return;
  }
  lastTap = now;
  setTimeout(() => {
    if (lastTap === now && view.scale === 1) void close();
  }, 290);
}
</script>

<template>
  <div class="fixed inset-0 z-50 touch-none select-none" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
    <div ref="backdrop" class="absolute inset-0 bg-black/95 backdrop-blur-sm" />
    <div
      class="absolute inset-0"
      :class="!touching && 'transition-transform duration-200 ease-out'"
      :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }"
    >
      <img
        ref="img"
        :src="src"
        alt=""
        draggable="false"
        class="absolute max-w-none origin-top-left object-contain"
        :style="{ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, opacity: ready ? 1 : 0 }"
      />
    </div>
  </div>
</template>
