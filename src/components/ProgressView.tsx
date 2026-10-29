"use client";
import { useEffect, useState } from "react";
import { Card } from "./ui";
import { TasteConstellation } from "./TasteConstellation";

export function ProgressView({ steps, warnings, city, names }: { steps: string[]; warnings: string[]; city: string; names: string[] }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const unique = steps.filter((s, i) => steps.indexOf(s) === i);
  const phase = unique.some((s) => s.startsWith("Finding") || s.startsWith("Writing")) ? 2 : unique.some((s) => s.startsWith("Comparing")) ? 1 : 0;
  return (
    <div className="mx-auto max-w-xl py-6">
      <TasteConstellation names={names} phase={phase} className="mx-auto mb-6 max-w-xs" />
      <Card className="rise">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Planning your event in {city}…</h2>
          <span className="text-sm tabular-nums text-muted">{secs}s</span>
        </div>
        <p className="mt-1 text-sm text-muted">Usually under a minute. You can leave this page open.</p>
        <ol className="mt-6 flex flex-col gap-3" aria-live="polite">
          {unique.map((s, i) => {
            const active = i === unique.length - 1;
            return (
              <li key={s} className="rise flex items-center gap-3">
                {active ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
                ) : (
                  <span className="grid size-5 place-items-center rounded-full bg-good text-[11px] font-bold text-white" aria-hidden>✓</span>
                )}
                <span className={active ? "font-medium" : "text-muted"}>{s}</span>
              </li>
            );
          })}
          {!unique.length && <li className="flex items-center gap-3 text-muted"><span className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />Warming up…</li>}
        </ol>
        {warnings.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-xl bg-warn/10 p-3 text-sm text-warn">{warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul>
        )}
      </Card>
    </div>
  );
}
