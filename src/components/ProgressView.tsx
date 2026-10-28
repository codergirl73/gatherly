"use client";
import { useEffect, useState } from "react";
import { Card } from "./ui";

export function ProgressView({ steps, warnings, city }: { steps: string[]; warnings: string[]; city: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const unique = steps.filter((s, i) => steps.indexOf(s) === i);
  return (
    <div className="mx-auto max-w-xl py-6">
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
      <div className="mt-4 space-y-3" aria-hidden>
        <div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" />
      </div>
    </div>
  );
}
