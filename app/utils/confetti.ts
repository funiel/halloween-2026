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
