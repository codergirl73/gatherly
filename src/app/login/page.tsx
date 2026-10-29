"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, inputCls } from "@/components/ui";
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
    <div className="bg-hero">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <div className="hidden md:block">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            Your events, <span className="text-brand">everywhere</span> you plan.
          </h1>
          <p className="mt-4 text-lg text-muted">Save every plan to your account and open it on any device.</p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            {["Save and revisit every plan", "Re-run a group with a different city", "Share a plan as text in one click"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-5 place-items-center rounded-full bg-good/15 text-xs text-good">✓</span>{t}</li>
            ))}
          </ul>
        </div>

        <Card className="rise">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          {mode !== "forgot" && (
            <div className="mb-5 mt-4 grid grid-cols-2 rounded-full bg-surface-2 p-1 text-sm font-semibold" role="tablist">
              {(["signin", "signup"] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
                  className={`rounded-full py-2 transition ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}>
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}
          {mode === "forgot" && <p className="mb-4 mt-1 text-sm text-muted">Enter your email and we&apos;ll send you a link to choose a new password.</p>}

          {!enabled && ready && (
            <p role="status" className="mb-4 rounded-xl bg-warn/10 p-3 text-sm text-warn">Accounts aren&apos;t available right now. You can still plan events as a guest.</p>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
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
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-fg">{show ? "Hide" : "Show"}</button>
                </div>
              </Field>
            )}
            {mode === "signin" && (
              <button type="button" onClick={() => switchMode("forgot")} className="-mt-2 self-start text-sm font-medium text-brand hover:underline">Forgot your password?</button>
            )}
            {error && <p role="alert" className="text-sm text-accent">{error}</p>}
            {notice && <p role="status" className="rounded-xl bg-good/10 p-3 text-sm text-good">{notice}</p>}
            <Button type="submit" size="lg" disabled={busy || !enabled}>
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          {mode === "forgot" && <button onClick={() => switchMode("signin")} className="mt-4 text-sm font-medium text-brand hover:underline">← Back to sign in</button>}

          {mode !== "forgot" && google && enabled && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <Button variant="secondary" className="w-full" onClick={async () => { const r = await signInWithGoogle(); if (!r.ok) setError(r.message); }}>Continue with Google</Button>
            </>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button variant="ghost" className="w-full" onClick={() => router.push("/plan")}>Continue as guest</Button>
          <p className="mt-5 text-center text-xs text-muted">
            Guests can plan events too; they&apos;re kept on this device only. <Link href="/events" className="underline">My events</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
