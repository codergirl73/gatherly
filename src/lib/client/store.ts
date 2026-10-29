"use client";
import { useSyncExternalStore } from "react";
import type { GroupInput, OverlapResult, Plan } from "../schemas";

/** Lightweight profile: lives only in this browser. Gatherly has no accounts or server-side user data. */
export interface User {
  name: string;
  email: string;
}

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

const USER_KEY = "gatherly-user";
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

export function useUser(): { user: User | null; ready: boolean } {
  const raw = useRaw(USER_KEY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  let user: User | null = null;
  try {
    user = raw ? (JSON.parse(raw) as User) : null;
  } catch {}
  return { user, ready };
}
export const signIn = (u: User) => set(USER_KEY, JSON.stringify(u));
export const signOut = () => set(USER_KEY, null);

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
  set(RUNS_KEY, JSON.stringify(runs.map((r) => (r.id === id ? { ...r, ...patch } : r))));
}
export function deleteRun(id: string) {
  set(RUNS_KEY, JSON.stringify(parseRuns(get(RUNS_KEY)).filter((r) => r.id !== id)));
}
export const newRunId = () => Math.random().toString(36).slice(2, 10);
