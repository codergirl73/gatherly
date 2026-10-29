"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { patchRun, useRun, type Run } from "@/lib/client/store";
import { useUser } from "@/lib/client/auth";
import type { AgentEvent } from "@/lib/schemas";
import { ProgressView } from "./ProgressView";
import { OverlapViz } from "./OverlapViz";
import { AtAGlance, PlanView, planToText } from "./PlanView";
import { CompareView } from "./CompareView";
import { ErrorState } from "./ErrorState";
import { AvatarStack } from "./Avatar";
import { Badge, Button, LinkButton } from "./ui";

const started = new Set<string>();

async function* readEvents(res: Response): AsyncGenerator<AgentEvent> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) yield JSON.parse(line) as AgentEvent;
    }
  }
}

export function RunClient({ id }: { id: string }) {
  const run = useRun(id);
  const [view, setView] = useState<"plan" | "compare">("plan");
  const [baselineBusy, setBaselineBusy] = useState(false);
  const [baselineFailed, setBaselineFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, ready } = useUser();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const input0 = run?.input;

  const start = useCallback(async (input: Run["input"]) => {
    patchRun(id, { status: "running", steps: [], warnings: [], error: undefined, plan: undefined, overlap: undefined, baseline: undefined });
    const steps: string[] = [], warnings: string[] = [];
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        const limited = res.status === 429;
        return patchRun(id, { status: "error", error: { kind: limited ? "rate_limited" : "unknown", message: limited ? "You've planned a lot of events. Please wait a few minutes and try again." : (j.error ?? "Couldn't start planning.") } });
      }
      let gotPlan = false;
      for await (const ev of readEvents(res)) {
        if (ev.type === "step") { steps.push(ev.message); patchRun(id, { steps: [...steps] }); }
        else if (ev.type === "warning") { warnings.push(ev.message); patchRun(id, { warnings: [...warnings] }); }
        else if (ev.type === "overlap") patchRun(id, { overlap: ev.overlap });
        else if (ev.type === "plan") { gotPlan = true; patchRun(id, { status: "done", plan: ev.plan, evidence: ev.evidence }); }
        else if (ev.type === "error") { patchRun(id, { status: "error", error: { kind: ev.kind, message: ev.message } }); gotPlan = true; }
      }
      if (!gotPlan) patchRun(id, { status: "error", error: { kind: "unavailable", message: "The connection dropped before the plan was ready." } });
    } catch {
      patchRun(id, { status: "error", error: { kind: "unavailable", message: "Network problem. Check your connection and try again." } });
    }
  }, [id]);

  const loadBaseline = useCallback(async (input: Run["input"] | undefined = input0) => {
    if (!input) return;
    setBaselineBusy(true); setBaselineFailed(false);
    try {
      const res = await fetch("/api/baseline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const j = await res.json();
      if (!res.ok) throw new Error();
      patchRun(id, { baseline: j.plan });
    } catch { setBaselineFailed(true); } finally { setBaselineBusy(false); }
  }, [id, input0]);

  useEffect(() => {
    if (!run || run.status !== "running" || started.has(id)) return;
    started.add(id);
    start(run.input);
    setTimeout(() => loadBaseline(run.input), 0); // LLM-only plan runs in parallel so the comparison is ready
  }, [run, id, start, loadBaseline]);

  if (!run && (!ready || (user && !waited))) {
    return <div className="mx-auto max-w-xl px-4 py-20"><div className="skeleton h-40 rounded-2xl" aria-busy aria-label="Loading your event" /></div>;
  }
  if (!run) {
    return <div className="px-4 py-20"><ErrorState kind="unknown" message="We couldn't find that event. It may have been cleared from this browser." /></div>;
  }
  const retry = () => { started.delete(id); patchRun(id, { status: "running" }); };

  const { input } = run;
  const names = input.people.map((p) => p.name);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {run.status === "running" && <ProgressView steps={run.steps} warnings={run.warnings} city={input.city} />}
      {run.status === "error" && <div className="py-10"><ErrorState kind={run.error?.kind ?? "unknown"} message={run.error?.message ?? "Please try again."} onRetry={retry} /></div>}

      {run.status === "done" && run.plan && (
        <div className="flex flex-col gap-10">
          <header className="rise flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{input.eventType}</Badge><Badge>{input.city}</Badge><Badge>Budget {input.budget}</Badge>{input.date && <Badge>{input.date}</Badge>}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{run.plan.title}</h1>
            <p className="max-w-3xl text-lg text-muted">{run.plan.summary}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><AvatarStack names={names} size={32} /><span className="text-sm text-muted">{names.join(", ")}</span></div>
              <div className="no-print flex flex-wrap gap-2">
                <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(planToText(run.plan!, input.city)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>{copied ? "Copied ✓" : "Copy plan"}</Button>
                <Button variant="secondary" onClick={() => window.print()}>Print</Button>
                <LinkButton href="/plan" variant="ghost">New event</LinkButton>
              </div>
            </div>
            {run.warnings.length > 0 && (
              <details className="rounded-xl bg-warn/10 p-3 text-sm text-warn"><summary className="cursor-pointer font-medium">{run.warnings.length} note{run.warnings.length > 1 ? "s" : ""} about matching</summary>
                <ul className="mt-2 list-disc pl-5">{run.warnings.map((w) => <li key={w}>{w}</li>)}</ul></details>
            )}
          </header>

          <AtAGlance plan={run.plan} />

          {run.overlap && <OverlapViz overlap={run.overlap} people={names} />}

          <div className="no-print sticky top-16 z-30 -mx-4 border-y border-border bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-3 sm:py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="grid grid-cols-2 rounded-full bg-surface-2 p-1 text-sm font-semibold" role="tablist">
                {(["plan", "compare"] as const).map((v) => (
                  <button key={v} role="tab" aria-selected={view === v} onClick={() => { setView(v); if (v === "compare" && !run.baseline && !baselineBusy) loadBaseline(input); }}
                    className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-surface shadow-sm" : "text-muted"}`}>{v === "plan" ? "Your plan" : "Qloo on / off"}</button>
                ))}
              </div>
              <span className="hidden text-xs text-muted sm:block">{view === "plan" ? "Every pick below was returned by Qloo." : "Same group, same constraints."}</span>
            </div>
          </div>

          {view === "plan" ? (
            <section aria-label="Your plan" className="mx-auto w-full max-w-3xl"><PlanView plan={run.plan} evidence={run.evidence} mode="qloo" /></section>
          ) : (
            <CompareView qloo={run.plan} llm={run.baseline} evidence={run.evidence} loading={baselineBusy} failed={baselineFailed} />
          )}

          <p className="text-center text-xs text-muted">Gatherly never books or pays for anything. <Link href="/events" className="underline">All events</Link></p>
        </div>
      )}
    </div>
  );
}
