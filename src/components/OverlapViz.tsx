import type { OverlapResult } from "@/lib/schemas";
import { Avatar, AvatarStack, colorFor } from "./Avatar";
import { Card } from "./ui";

function Gauge({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`Group taste overlap ${value} percent`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--brand)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="font-display text-3xl font-semibold">{value}%</div><div className="text-[11px] uppercase tracking-wide text-muted">overlap</div></div>
      </div>
    </div>
  );
}

export function OverlapViz({ overlap, people }: { overlap: OverlapResult; people: string[] }) {
  const maxShared = overlap.shared[0]?.people.length ?? 1;
  const score = (a: string, b: string) => overlap.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))?.score;
  const verdict = overlap.groupScore >= 40 ? "Plenty of common ground" : overlap.groupScore >= 20 ? "Some shared ground, with real variety" : "A diverse group, so we'll balance carefully";

  return (
    <section aria-labelledby="overlap-h" className="flex flex-col gap-4">
      <div>
        <h2 id="overlap-h" className="font-display text-2xl font-semibold">Where your tastes meet</h2>
        <p className="text-sm text-muted">
          {overlap.source === "qloo-compare" ? "Measured with Qloo's analysis/compare: each person against the rest of the group." : "Measured from the Qloo taste tags attached to each person's favorites."}
        </p>
      </div>

      <Card className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-5">
          <Gauge value={overlap.groupScore} />
          <div className="md:hidden"><div className="font-semibold">{verdict}</div></div>
        </div>
        <div>
          <div className="hidden font-semibold md:block">{verdict}</div>
          <p className="mt-1 text-sm text-muted">Share of each person&apos;s taste themes that at least one other person also has.</p>
          <h3 className="mt-4 text-sm font-semibold">Shared by the group</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {overlap.shared.slice(0, 8).map((t) => (
              <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[11rem_1fr_auto]">
                <span className="truncate text-sm font-medium capitalize">{t.label}</span>
                <span className="hidden h-2 rounded-full bg-surface-2 sm:block">
                  <span className="block h-2 rounded-full bg-brand" style={{ width: `${(t.people.length / maxShared) * 100}%` }} />
                </span>
                <AvatarStack names={t.people} size={22} />
              </li>
            ))}
            {!overlap.shared.length && <li className="text-sm text-muted">No themes are shared by two or more people.</li>}
          </ul>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Uniquely each person</h3>
          <div className="mt-3 flex flex-col gap-3">
            {people.map((p) => (
              <div key={p} className="flex items-start gap-3">
                <Avatar name={p} size={28} />
                <div className="flex flex-wrap gap-1.5">
                  {(overlap.individual[p] ?? []).slice(0, 5).map((t) => (
                    <span key={t.id} className="rounded-full px-2.5 py-1 text-xs font-medium capitalize" style={{ background: `color-mix(in srgb, ${colorFor(p)} 16%, transparent)`, color: colorFor(p) }}>{t.label}</span>
                  ))}
                  {!(overlap.individual[p] ?? []).length && <span className="text-xs text-muted">Everything they like is shared.</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">Who clicks with whom</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-center text-xs" aria-label="Pairwise taste similarity">
              <thead><tr><th />{people.map((p) => <th key={p} className="font-medium text-muted"><Avatar name={p} size={22} /></th>)}</tr></thead>
              <tbody>
                {people.map((a) => (
                  <tr key={a}>
                    <th className="text-left"><Avatar name={a} size={22} /></th>
                    {people.map((b) => {
                      const s = a === b ? undefined : score(a, b);
                      return (
                        <td key={b} title={s === undefined ? "" : `${a} & ${b}: ${s}%`} className="rounded-md py-2 font-semibold"
                          style={{ background: s === undefined ? "var(--surface-2)" : `color-mix(in srgb, var(--brand) ${Math.min(100, 12 + s * 1.8)}%, transparent)`, color: s !== undefined && s > 35 ? "var(--brand-fg)" : "var(--fg)" }}>
                          {s === undefined ? "–" : s}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Jaccard similarity of taste themes (0–100).</p>
        </Card>
      </div>
    </section>
  );
}
