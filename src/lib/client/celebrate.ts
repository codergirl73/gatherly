"use client";

const COLORS = ["#6d4aff", "#ff6b4a", "#14915f", "#d6409f", "#0e7ad6", "#f0b429"];

/** One-shot confetti burst (plain canvas, no dependencies). Skipped for reduced-motion users. */
export function celebrate() {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60";
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const pieces = Array.from({ length: 140 }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -1 : 1) * (Math.PI / 2 - 0.4 - Math.random() * 0.9) - Math.PI / 2;
    const speed = 9 + Math.random() * 11;
    return {
      x: fromLeft ? 0 : innerWidth,
      y: innerHeight * 0.75,
      vx: Math.cos(angle) * speed * (fromLeft ? -1 : 1) * -1,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[i % COLORS.length],
      round: Math.random() < 0.3,
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.28;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1.8) / 0.9);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < 2.8) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
