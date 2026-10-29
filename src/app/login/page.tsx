"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, inputCls } from "@/components/ui";
import { sendPasswordReset, signInWithGoogle, signInWithPassword, signUp, useUser } from "@/lib/client/auth";
import { accountsEnabled } from "@/lib/client/supabase";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useUser();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (ready && user) router.replace("/plan");
  }, [ready, user, router]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setNotice("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setError("Enter a valid email address.");
    if (mode === "signup" && !name.trim()) return setError("Tell us your name.");
    if (mode !== "forgot" && password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const r = await sendPasswordReset(em);
        if (!r.ok) setError(r.message);
        else setNotice("If an account exists for that email, a reset link is on its way.");
      } else if (mode === "signup") {
        const r = await signUp(name.trim(), em, password);
        if (!r.ok) setError(r.message);
        else if (r.needsConfirmation) setNotice("Check your inbox. We sent a link to confirm your email, then you can sign in.");
        else router.push("/plan");
      } else {
        const r = await signInWithPassword(em, password);
        if (!r.ok) setError(r.message);
        else router.push("/plan");
      }
    } finally {
      setBusy(false);
    }
  };

  const enabled = accountsEnabled();
  const google = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";
  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1b1240] text-white lg:block" aria-hidden>
        <div className="absolute -left-24 -top-24 size-[28rem] rounded-full bg-brand/50 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 size-[26rem] rounded-full bg-accent/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">Plan once.<br />Everyone&apos;s in.</h2>
            <p className="mt-4 max-w-md text-lg text-white/70">Save every plan to your account and open it on any device.</p>
          </div>

          <div className="my-10 max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/60">
              <span>Sample plan</span><span className="rounded-full bg-white/15 px-2.5 py-1 normal-case tracking-normal text-white">Lisbon · 5 people</span>
            </div>
            <div className="mt-3 font-display text-2xl font-semibold">Lisbon&apos;s Artistic Soul</div>
            <div className="mt-4 space-y-2.5 text-sm">
              {[["🍽️", "Venue & cuisine", "Fits 4 of 5"], ["🎵", "Playlist", "5 artists"], ["📍", "Activity", "Fits 3 of 5"]].map(([i, l, f]) => (
                <div key={l} className="flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5"><span>{i}</span>{l}</span><span className="text-white/70">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              {["Ana", "Liam", "Yuki", "Omar", "Greta"].map((n, i) => (
                <span key={n} className="grid size-7 place-items-center rounded-full text-xs font-bold ring-2 ring-[#2a1c63]" style={{ background: ["#ff6b4a", "#6d4aff", "#14915f", "#d6409f", "#0e7ad6"][i], marginLeft: i ? -8 : 0 }}>{n[0]}</span>
              ))}
              <span className="ml-1 text-xs text-white/70">tastes matched</span>
            </div>
          </div>

          <ul className="space-y-3 text-sm text-white/80">
            {["Every pick explains whose favorites it connects to", "See where your group overlaps, and where it differs", "Reopen and share plans from any device"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-5 place-items-center rounded-full bg-white/15 text-xs">✓</span>{t}</li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="bg-hero flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="rise w-full max-w-sm">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">
            {mode === "signin" ? "Sign in to see your saved events." : mode === "signup" ? "Free, and it takes under a minute." : "Enter your email and we'll send you a link to choose a new password."}
          </p>

          {!enabled && ready && (
            <p role="status" className="mt-5 rounded-xl bg-warn/10 p-3 text-sm text-warn">Accounts aren&apos;t available right now. You can still plan events as a guest.</p>
          )}

          {mode !== "forgot" && google && enabled && (
            <>
              <Button variant="secondary" size="lg" className="mt-6 w-full" onClick={async () => { const r = await signInWithGoogle(); if (!r.ok) setError(r.message); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z"/></svg>
                Continue with Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
            </>
          )}

          <form onSubmit={submit} className={`flex flex-col gap-4 ${google && mode !== "forgot" ? "" : "mt-7"}`} noValidate>
            {mode === "signup" && (
              <Field label="Your name" htmlFor="name">
                <input id="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" maxLength={60} />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input id="email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </Field>
            {mode !== "forgot" && (
              <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
                <div className="relative">
                  <input id="password" type={show ? "text" : "password"} className={`${inputCls} pr-16`} value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-fg">{show ? "Hide" : "Show"}</button>
                </div>
              </Field>
            )}
            {mode === "signin" && (
              <button type="button" onClick={() => switchMode("forgot")} className="-mt-2 self-end text-sm font-medium text-brand hover:underline">Forgot password?</button>
            )}
            {error && <p role="alert" className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-good/10 p-3 text-sm text-good">{notice}</p>}
            <Button type="submit" size="lg" disabled={busy || !enabled} className="mt-1">
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {mode === "signin" && <>New to Gatherly? <button onClick={() => switchMode("signup")} className="font-semibold text-brand hover:underline">Create an account</button></>}
            {mode === "signup" && <>Already have an account? <button onClick={() => switchMode("signin")} className="font-semibold text-brand hover:underline">Sign in</button></>}
            {mode === "forgot" && <button onClick={() => switchMode("signin")} className="font-semibold text-brand hover:underline">← Back to sign in</button>}
          </p>

          <div className="mt-8 border-t border-border pt-6 text-center">
            <Button variant="ghost" className="w-full" onClick={() => router.push("/plan")}>Continue as guest →</Button>
            <p className="mt-2 text-xs text-muted">Guest events stay on this device. <Link href="/events" className="underline">My events</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
