import { Avatar, colorFor } from "./Avatar";

interface Props {
  names: string[];
  /** Floating taste themes drifting near the center. */
  chips?: string[];
  /** 0 = matching favorites, 1 = comparing tastes, 2 = building the plan. Omit for the idle hero state (everything flowing). */
  phase?: 0 | 1 | 2;
  className?: string;
}

const CHIP_SPOTS = [
  { left: "50%", top: "30%" },
  { left: "63%", top: "55%" },
  { left: "36%", top: "58%" },
  { left: "50%", top: "72%" },
];

/**
 * A "taste constellation": each person is a node on a ring, lines converge on a shared center
 * (the event), and themes everyone shares drift through the middle.
 */
export function TasteConstellation({ names, chips = [], phase, className = "" }: Props) {
  const n = names.length;
  const pts = names.map((name, i) => {
    const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
    return { name, x: 50 + 36 * Math.cos(a), y: 50 + 36 * Math.sin(a) };
  });
  const flowing = phase === undefined || phase >= 1;
  const rippling = phase === undefined || phase === 2;
  const matching = phase === 0;

  return (
    <div className={`relative aspect-square w-full ${className}`} role="img" aria-label={`Taste map connecting ${names.join(", ")}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="orb" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="var(--brand)" stopOpacity=".35" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="36" fill="none" stroke="var(--border)" strokeWidth=".3" strokeDasharray="1 2" />
        <circle cx="50" cy="50" r="22" fill="url(#orb)" />
        {pts.map((p, i) => {
          const q = pts[(i + 1) % n];
          return <line key={`c${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--border)" strokeWidth=".35" />;
        })}
        {pts.map((p) => (
          <line key={p.name} x1={p.x} y1={p.y} x2="50" y2="50" stroke={colorFor(p.name)} strokeWidth=".6" strokeLinecap="round"
            strokeDasharray="2 2.5" opacity={flowing ? 0.9 : 0.25} className={flowing ? "constellation-flow" : ""} />
        ))}
        {rippling && [0, 1].map((i) => (
          <circle key={i} cx="50" cy="50" r="9" fill="none" stroke="var(--brand)" strokeWidth=".5" className="constellation-ripple" style={{ animationDelay: `${i * 1.3}s` }} />
        ))}
      </svg>

      <div className="absolute left-1/2 top-1/2 grid size-[18%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-brand to-accent shadow-lg" style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--brand) 45%, transparent)" }}>
        <svg viewBox="0 0 32 32" className="size-[60%]" aria-hidden><circle cx="12" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.6" /><circle cx="20" cy="16" r="6" fill="none" stroke="#fff" strokeWidth="2.6" /></svg>
      </div>

      {pts.map((p, i) => (
        <div key={p.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div className="constellation-float" style={{ animationDelay: `${i * 0.6}s` }}>
            <span className={`relative grid place-items-center rounded-full ${matching ? "constellation-pulse" : ""}`} style={{ color: colorFor(p.name) }}>
              <Avatar name={p.name} size={44} ring />
            </span>
            <span className="mt-1 block text-center text-[11px] font-semibold text-muted">{p.name}</span>
          </div>
        </div>
      ))}

      {chips.slice(0, CHIP_SPOTS.length).map((c, i) => (
        <span key={c} className="constellation-float absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs font-semibold text-brand shadow-sm backdrop-blur"
          style={{ ...CHIP_SPOTS[i], animationDelay: `${i * 0.9 + 0.3}s` }}>{c}</span>
      ))}
    </div>
  );
}
