"use client";
import { useRouter } from "next/navigation";
import { newRunId, saveRun } from "@/lib/client/store";
import type { Preset } from "@/lib/presets";
import { AvatarStack } from "./Avatar";

export function startRun(router: { push: (p: string) => void }, input: Preset["group"]) {
  const id = newRunId();
  saveRun({ id, createdAt: Date.now(), input, status: "running", warnings: [], steps: [] });
  router.push(`/run/${id}`);
}

export function PresetCard({ preset }: { preset: Preset }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => startRun(router, preset.group)}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl" aria-hidden>{preset.emoji}</span>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">{preset.group.city}</span>
      </div>
      <div>
        <div className="font-display text-lg font-semibold">{preset.label}</div>
        <p className="mt-1 text-sm text-muted">{preset.blurb}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2">
        <AvatarStack names={preset.group.people.map((p) => p.name)} />
        <span className="text-sm font-semibold text-brand transition group-hover:translate-x-0.5">Plan this →</span>
      </div>
    </button>
  );
}

export function ExampleButton({ preset, children, className }: { preset: Preset; children: React.ReactNode; className: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => startRun(router, preset.group)}>
      {children}
    </button>
  );
}
