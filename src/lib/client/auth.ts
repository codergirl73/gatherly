"use client";
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { clearLocalRuns, pullRuns } from "./store";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Avatar color chosen at sign-up. */
  color?: string;
}

interface AuthState {
  user: User | null;
  /** False until the initial session lookup has finished (avoids flashing "Sign in"). */
  ready: boolean;
}

const SERVER_STATE: AuthState = { user: null, ready: false };
let state: AuthState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;

const toUser = (s: Session | null): User | null => {
  const u = s?.user;
  if (!u) return null;
  const email = u.email ?? "";
  const name = (u.user_metadata?.name as string | undefined)?.trim() || email.split("@")[0] || "You";
  return { id: u.id, name, email, color: (u.user_metadata?.color as string | undefined) || undefined };
};

const set = (next: AuthState) => {
  state = next;
  listeners.forEach((l) => l());
};

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const sb = getSupabase();
  if (!sb) return set({ user: null, ready: true });
  sb.auth.getSession().then(({ data }) => {
    set({ user: toUser(data.session), ready: true });
    if (data.session) void pullRuns();
  });
  sb.auth.onAuthStateChange((event, session) => {
    set({ user: toUser(session), ready: true });
    if (event === "SIGNED_IN") void pullRuns();
  });
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useUser(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

export const currentUser = () => state.user;

type Result = { ok: true; needsConfirmation?: boolean } | { ok: false; message: string };

const friendly = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again or reset your password.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with that email already exists. Try signing in.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("password") && m.includes("characters")) return "Use at least 8 characters for your password.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("fetch") || m.includes("network")) return "Couldn't reach the sign-in service. Check your connection and try again.";
  return message;
};

const noAccounts: Result = { ok: false, message: "Accounts aren't available right now. You can continue as a guest." };

export async function signUp(name: string, email: string, password: string, color?: string): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return noAccounts;
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name, color }, emailRedirectTo: `${location.origin}/plan` },
  });
  if (error) return { ok: false, message: friendly(error.message) };
  // Supabase returns an empty identities list for an already-registered email (no error, to avoid leaking accounts).
  if (data.user && data.user.identities?.length === 0) return { ok: false, message: friendly("already registered") };
  return { ok: true, needsConfirmation: !data.session };
}

export async function signInWithPassword(email: string, password: string): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return noAccounts;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: friendly(error.message) } : { ok: true };
}

/** Passwordless sign-in: emails a one-time link (works for existing accounts; new emails get an account). */
export async function sendMagicLink(email: string): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return noAccounts;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/plan` } });
  return error ? { ok: false, message: friendly(error.message) } : { ok: true };
}

export async function signInWithGoogle(): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return noAccounts;
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/plan` } });
  return error ? { ok: false, message: friendly(error.message) } : { ok: true };
}

export async function sendPasswordReset(email: string): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return noAccounts;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
  return error ? { ok: false, message: friendly(error.message) } : { ok: true };
}

export async function updatePassword(password: string): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return noAccounts;
  const { error } = await sb.auth.updateUser({ password });
  return error ? { ok: false, message: friendly(error.message) } : { ok: true };
}

export async function signOut() {
  await getSupabase()?.auth.signOut();
  clearLocalRuns(); // don't leave a signed-out user's events on a shared device
}
