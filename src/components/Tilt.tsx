"use client";
import { useRef, type ReactNode } from "react";

/** Mouse-driven 3D tilt with a moving glare. No-ops for touch and reduced-motion users. */
export function Tilt({ children, className = "", max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(8px)`;
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    el.style.setProperty("--glare", "1");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--glare", "0");
  };

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`relative transition-transform duration-200 ease-out [transform-style:preserve-3d] ${className}`}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
        style={{ opacity: "var(--glare, 0)", background: "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,.16), transparent 55%)" }}
      />
    </div>
  );
}
