import type { Plan } from "@/lib/schemas";
import { PlanView } from "./PlanView";
import { Card } from "./ui";

const picks = (p: Plan) => [p.venue, ...p.playlist.artists, p.activity, ...(p.film ? [p.film] : [])];

export function CompareView({ qloo, llm, evidence, loading, failed }: { qloo: Plan; llm?: Plan; evidence?: Record<string, string[]>; loading: boolean; failed: boolean }) {
  const q = picks(qloo);
  const grounded = q.filter((p) => p.entityId).length;
  const avgFits = (arr: { fits: string[] }[]) => (arr.reduce((s, p) => s + p.fits.length, 0) / (arr.length || 1)).toFixed(1);
  return (
    <section aria-labelledby="cmp-h" className="flex flex-col gap-4">
      <div>
        <h2 id="cmp-h" className="font-display text-2xl font-semibold">Qloo on vs. off</h2>
        <p className="text-sm text-muted">The same group and constraints, planned two ways. The LLM-only plan has no taste data behind it.</p>
      </div>
      {llm && (
        <Card className="grid gap-4 sm:grid-cols-3">
          <Stat label="Picks traceable to real Qloo data" qloo={`${grounded}/${q.length}`} llm={`0/${picks(llm).length}`} />
          <Stat label="Avg. members each pick fits" qloo={avgFits(q)} llm={`${avgFits(picks(llm))} (self-reported)`} />
          <Stat label="Shows why with real evidence" qloo="Yes" llm="No" />
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-brand-fg">With Qloo</span></div>
          <PlanView plan={qloo} evidence={evidence} mode="qloo" />
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">LLM only</span><span className="text-xs text-muted">may include venues that don&apos;t exist</span></div>
          {llm ? <PlanView plan={llm} mode="llm" /> : loading ? (
            <div className="space-y-4" aria-busy><div className="skeleton h-40 rounded-2xl" /><div className="skeleton h-56 rounded-2xl" /><div className="skeleton h-40 rounded-2xl" /></div>
          ) : (
            <Card className="text-sm text-muted">{failed ? "The LLM-only plan couldn't be generated right now." : "Not generated yet."}</Card>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, qloo, llm }: { label: string; qloo: string; llm: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="font-display text-2xl font-semibold text-brand">{qloo}</span>
        <span className="text-sm text-muted">vs {llm}</span>
      </div>
    </div>
  );
}
