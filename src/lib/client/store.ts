"use client";
import { useSyncExternalStore } from "react";
import type { GroupInput, OverlapResult, Plan } from "../schemas";
import { currentUser } from "./auth";
import { getSupabase } from "./supabase";

export interface Run {
  id: string;
  createdAt: number;
  input: GroupInput;
  status: "running" | "done" | "error";
  plan?: Plan;
  baseline?: Plan;
  overlap?: OverlapResult;
  evidence?: Record<string, string[]>;
  warnings: string[];
  steps: string[];
  error?: { message: string; kind: string };
}

const RUNS_KEY = "gatherly-runs";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* storage unavailable (private mode): app still works for this session via memory */
  }
  emit();
};

// Memory fallback so the app works when localStorage is blocked.
const mem = new Map<string, string>();
const get = (key: string) => read(key) ?? mem.get(key) ?? null;
const set = (key: string, v: string | null) => {
  if (v === null) mem.delete(key);
  else mem.set(key, v);
  write(key, v);
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const useRaw = (key: string) => useSyncExternalStore(subscribe, () => get(key), () => null);

const parseRuns = (raw: string | null): Run[] => {
  try {
    return raw ? (JSON.parse(raw) as Run[]) : [];
  } catch {
    return [];
  }
};

export function useRuns(): Run[] {
  const raw = useRaw(RUNS_KEY);
  return parseRuns(raw);
}
export function useRun(id: string): Run | undefined {
  return useRuns().find((r) => r.id === id);
}
export function saveRun(run: Run) {
  const runs = parseRuns(get(RUNS_KEY)).filter((r) => r.id !== run.id);
  set(RUNS_KEY, JSON.stringify([run, ...runs].slice(0, 20)));
}
export function patchRun(id: string, patch: Partial<Run>) {
  const runs = parseRuns(get(RUNS_KEY));
  const next = runs.map((r) => (r.id === id ? { ...r, ...patch } : r));
  set(RUNS_KEY, JSON.stringify(next));
  const run = next.find((r) => r.id === id);
  if (run && run.status !== "running") schedulePush(run);
}
export function deleteRun(id: string) {
  set(RUNS_KEY, JSON.stringify(parseRuns(get(RUNS_KEY)).filter((r) => r.id !== id)));
  const sb = getSupabase();
  if (sb && currentUser()) void sb.from("events").delete().eq("id", id).then(() => {});
}
export function clearLocalRuns() {
  set(RUNS_KEY, null);
}

// ---- Account sync (Supabase) -------------------------------------------------
// Runs are worked on in localStorage (fast, streams many updates) and written to the
// signed-in user's `events` table once a run finishes or changes after finishing.

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function schedulePush(run: Run) {
  if (!currentUser() || !getSupabase()) return;
  clearTimeout(timers.get(run.id));
  timers.set(run.id, setTimeout(() => void pushRun(run.id), 600));
}

const toRow = (r: Run) => ({
  id: r.id,
  created_at: r.createdAt,
  status: r.status,
  input: r.input,
  plan: r.plan ?? null,
  baseline: r.baseline ?? null,
  overlap: r.overlap ?? null,
  evidence: r.evidence ?? null,
  warnings: r.warnings,
  error: r.error ?? null,
  updated_at: new Date().toISOString(),
});

async function pushRun(id: string) {
  const sb = getSupabase();
  const user = currentUser();
  const run = parseRuns(get(RUNS_KEY)).find((r) => r.id === id);
  if (!sb || !user || !run || run.status === "running") return;
  await sb.from("events").upsert({ ...toRow(run), user_id: user.id }, { onConflict: "user_id,id" });
}

/** On sign-in: merge the account's saved events into this device and upload finished guest events. */
export async function pullRuns() {
  const sb = getSupabase();
  const user = currentUser();
  if (!sb || !user) return;
  const { data, error } = await sb.from("events").select("*").order("created_at", { ascending: false }).limit(50);
  if (error || !data) return;
  const remote: Run[] = data.map((row) => ({
    id: row.id,
    createdAt: Number(row.created_at),
    input: row.input,
    status: row.status,
    plan: row.plan ?? undefined,
    baseline: row.baseline ?? undefined,
    overlap: row.overlap ?? undefined,
    evidence: row.evidence ?? undefined,
    warnings: row.warnings ?? [],
    steps: [],
    error: row.error ?? undefined,
  }));
  const remoteIds = new Set(remote.map((r) => r.id));
  const local = parseRuns(get(RUNS_KEY));
  const localOnly = local.filter((r) => !remoteIds.has(r.id));
  const merged = [...remote, ...localOnly].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  set(RUNS_KEY, JSON.stringify(merged));
  for (const r of localOnly) if (r.status !== "running") schedulePush(r);
}
export const newRunId = () => Math.random().toString(36).slice(2, 10);
