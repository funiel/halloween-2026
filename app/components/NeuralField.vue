<script setup lang="ts">
/**
 * The model's "brain": drifting nodes, connected when close. More nodes and
 * faster drift as AGI approaches; every `pulse` bump sends light racing
 * along the connections.
 */
const props = defineProps<{ percent: number; pulse: number }>();

const canvas = ref<HTMLCanvasElement>();

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
interface Pulse {
  from: number;
  to: number;
  t: number;
  hops: number;
}

const LINK = 120; // px (CSS) within which nodes connect

let nodes: Node[] = [];
let pulses: Pulse[] = [];
let raf = 0;
let W = 0;
let H = 0;
let dpr = 1;

const targetCount = () => Math.round(28 + props.percent * 0.9);

function spawn(): Node {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: 1 + Math.random() * 1.6,
  };
}

function resize() {
  const el = canvas.value!;
  dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth;
  H = innerHeight;
  el.width = W * dpr;
  el.height = H * dpr;
}

/** White → amber → red, like the counter. */
function tint(alpha: number) {
  const p = props.percent;
  const rgb = p >= 92 ? "248 113 113" : p >= 70 ? "252 211 77" : "200 210 255";
  return `rgb(${rgb} / ${alpha})`;
}

function neighbours(i: number) {
  const a = nodes[i]!;
  const out: number[] = [];
  nodes.forEach((b, j) => {
    if (j !== i && Math.hypot(a.x - b.x, a.y - b.y) < LINK) out.push(j);
  });
  return out;
}

/** Light travels out from a few random nodes and keeps hopping along links. */
function firePulse() {
  for (let k = 0; k < 6; k++) {
    const from = Math.floor(Math.random() * nodes.length);
    const next = neighbours(from);
    if (next.length) pulses.push({ from, to: next[Math.floor(Math.random() * next.length)]!, t: 0, hops: 5 });
  }
}
watch(() => props.pulse, firePulse);

function frame() {
  const ctx = canvas.value?.getContext("2d");
  if (!ctx) return;
  const speed = 1 + props.percent / 40;

  // Grow (or shrink) towards the target node count gradually.
  const want = targetCount();
  if (nodes.length < want) nodes.push(spawn());
  else if (nodes.length > want + 4) nodes.pop();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  for (const n of nodes) {
    n.x += n.vx * speed;
    n.y += n.vy * speed;
    if (n.x < 0 || n.x > W) n.vx *= -1;
    if (n.y < 0 || n.y > H) n.vy *= -1;
  }

  ctx.lineWidth = 0.6;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > LINK) continue;
      ctx.strokeStyle = tint(0.14 * (1 - d / LINK));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  for (const n of nodes) {
    ctx.fillStyle = tint(0.55);
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pulses: a bright dot sliding along a link, then hopping to the next one.
  const alive: Pulse[] = [];
  for (const p of pulses) {
    p.t += 0.045;
    const a = nodes[p.from];
    const b = nodes[p.to];
    if (!a || !b) continue;
    const x = a.x + (b.x - a.x) * p.t;
    const y = a.y + (b.y - a.y) * p.t;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
    glow.addColorStop(0, "rgb(167 243 208 / 0.95)");
    glow.addColorStop(1, "rgb(52 211 153 / 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgb(110 231 183 / 0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (p.t < 1) alive.push(p);
    else if (p.hops > 0) {
      const next = neighbours(p.to).filter((j) => j !== p.from);
      if (next.length) alive.push({ from: p.to, to: next[Math.floor(Math.random() * next.length)]!, t: 0, hops: p.hops - 1 });
    }
  }
  pulses = alive;

  raf = requestAnimationFrame(frame);
}

function onVisibility() {
  cancelAnimationFrame(raf);
  if (!document.hidden) raf = requestAnimationFrame(frame);
}

onMounted(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  resize();
  nodes = Array.from({ length: targetCount() }, spawn);
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  removeEventListener("resize", resize);
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 size-full" aria-hidden="true" />
</template>
