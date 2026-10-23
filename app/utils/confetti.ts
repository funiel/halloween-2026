const COLORS = ["#fcd34d", "#fbbf24", "#f59e0b", "#fff8dc", "#fb7185", "#a78bfa", "#34d399", "#60a5fa"];

interface Options {
  count?: number;
  /** "center" bursts up from the middle; "sides" fires in from both bottom corners. */
  from?: "center" | "sides";
  duration?: number;
}

/** Tiny canvas confetti, no dependency. Cleans up after itself. */
export function confetti({ count = 140, from = "center", duration = 4200 }: Options = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "80" });
  document.body.appendChild(canvas);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext("2d")!;

  const parts = Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const sides = from === "sides";
    return {
      x: sides ? (left ? 0 : W) : W / 2 + (Math.random() - 0.5) * W * 0.15,
      y: sides ? H * 0.95 : H * 0.6,
      vx: sides ? (left ? 1 : -1) * (W * 0.008 + Math.random() * W * 0.018) : (Math.random() - 0.5) * W * 0.03,
      vy: -(H * 0.014 + Math.random() * H * 0.026),
      w: (7 + Math.random() * 7) * dpr,
      h: (4 + Math.random() * 5) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, Math.min(1, (duration - t) / 800));
    for (const p of parts) {
      p.vy += H * 0.00055;
      p.vx *= 0.988;
      p.vy *= 0.988;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.rot * 1.7)); // paper flutter
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

const FIREWORK_COLORS = ["#fcd34d", "#fde68a", "#fff8dc", "#f59e0b", "#fb7185", "#a78bfa", "#67e8f9"];

/** Rockets that climb with a glowing trail and burst into sparks. Canvas, no dependency. */
export function fireworks({ rockets = 9, duration = 6500 }: { rockets?: number; duration?: number } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "79" });
  document.body.appendChild(canvas);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext("2d")!;

  interface Rocket { x: number; y: number; vy: number; peak: number; color: string; launch: number; done: boolean }
  interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }

  const start = performance.now();
  const launches: Rocket[] = Array.from({ length: rockets }, (_, i) => ({
    x: W * (0.15 + Math.random() * 0.7),
    y: H,
    vy: -(H * 0.016 + Math.random() * H * 0.006),
    peak: H * (0.15 + Math.random() * 0.3),
    color: FIREWORK_COLORS[i % FIREWORK_COLORS.length]!,
    launch: i * (duration * 0.55 / rockets) + Math.random() * 200,
    done: false,
  }));
  let sparks: Spark[] = [];

  function explode(r: Rocket) {
    const n = 70 + Math.floor(Math.random() * 40);
    const power = W * (0.004 + Math.random() * 0.003);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = power * (0.5 + Math.random() * 0.6);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: Math.random() < 0.3 ? "#fff8dc" : r.color });
    }
  }

  const frame = (now: number) => {
    const t = now - start;
    // Fade the previous frame instead of clearing: gives every spark a trail.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgb(0 0 0 / 0.22)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    for (const r of launches) {
      if (r.done || t < r.launch) continue;
      r.y += r.vy;
      ctx.fillStyle = "#fff8dc";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.2 * dpr, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.peak) {
        r.done = true;
        explode(r);
      }
    }

    for (const s of sparks) {
      s.vy += H * 0.00012;
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.012;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    sparks = sparks.filter((s) => s.life > 0);

    if (t < duration || sparks.length) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
