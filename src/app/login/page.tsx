"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, inputCls } from "@/components/ui";
import { Avatar, AVATAR_COLORS } from "@/components/Avatar";
import { Gather3D } from "@/components/Gather3D";
import { sendMagicLink, sendPasswordReset, signInWithGoogle, signInWithPassword, signUp, useUser } from "@/lib/client/auth";
import { accountsEnabled } from "@/lib/client/supabase";
import { celebrate } from "@/lib/client/celebrate";

type Mode = "signin" | "signup" | "forgot" | "magic";

/** 0-4 score with a friendly label. Length first, then variety. */
function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) score = Math.min(score, 0);
  const labels = ["Too short", "Okay", "Good", "Strong", "Excellent"];
  const tips = ["Use at least 8 characters.", "Add a longer phrase or mixed case.", "Add a number or symbol to level up.", "Nice. A little longer and it's bulletproof.", "That's a great password."];
  return { score, label: labels[pw ? score : 0], tip: pw ? tips[score] : "Use at least 8 characters." };
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useUser();
  const [mode, setMode] = useState<Mode>("signin");
  const [sstep, setSstep] = useState(0);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<null | { title: string; body: string }>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user && !welcome) router.replace("/plan");
  }, [ready, user, router, welcome]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSstep(0);
    setError("");
    setSent(null);
  };

  const validEmail = () => /^\S+@\S+\.\S+$/.test(email.trim());
  const st = strength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const em = email.trim();

    if (mode === "signup" && sstep === 0) {
      if (!name.trim()) return setError("What should we call you?");
      return setSstep(1);
    }
    if (!validEmail()) return setError("Enter a valid email address.");
    if ((mode === "signup" || mode === "signin") && password.length < 8) return setError("Use at least 8 characters for your password.");

    setBusy(true);
    try {
      if (mode === "forgot") {
        const r = await sendPasswordReset(em);
        if (!r.ok) setError(r.message);
        else setSent({ title: "Reset link on its way", body: "If an account exists for that email, you'll get a link to choose a new password." });
      } else if (mode === "magic") {
        const r = await sendMagicLink(em);
        if (!r.ok) setError(r.message);
        else setSent({ title: "Check your inbox", body: `We sent a one-time sign-in link to ${em}. Open it on this device and you're in.` });
      } else if (mode === "signup") {
        const r = await signUp(name.trim(), em, password, color);
        if (!r.ok) setError(r.message);
        else if (r.needsConfirmation) setSent({ title: `Almost there, ${name.trim().split(" ")[0]}`, body: `We sent a confirmation link to ${em}. Tap it, then sign in and start planning.` });
        else {
          setWelcome(`You're in, ${name.trim().split(" ")[0]}!`);
          celebrate();
          setTimeout(() => router.push("/plan"), 1600);
        }
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
  const first = name.trim().split(" ")[0];

  const headline =
    mode === "signup" ? (first ? <>Hi {first},<br />pull up a chair.</> : <>Plan once.<br />Everyone&apos;s in.</>) : mode === "signin" ? <>Welcome back.<br />The group missed you.</> : <>Plan once.<br />Everyone&apos;s in.</>;

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1b1240] text-white lg:block" aria-hidden>
        <div className="absolute -left-24 -top-24 size-[28rem] rounded-full bg-brand/50 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 size-[26rem] rounded-full bg-accent/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">{headline}</h2>
            <p className="mt-4 max-w-md text-lg text-white/70">
              {mode === "signup" ? "Pick your color and watch yourself join the group." : "Save every plan to your account and open it on any device."}
            </p>
          </div>
          <Gather3D names={["Ana", "Liam", "Yuki", "Omar", "Greta"]} youColor={mode === "signup" ? color : undefined} className="my-6 h-80" />
          <ul className="space-y-3 text-sm text-white/80">
            {["Every pick explains whose favorites it connects to", "See where your group overlaps, and where it differs", "Reopen and share plans from any device"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-5 place-items-center rounded-full bg-white/15 text-xs">✓</span>{t}</li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="bg-hero flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="rise w-full max-w-sm">
          {welcome ? (
            <div className="text-center" role="status">
              <div className="mx-auto"><Avatar name={name} size={80} color={color} /></div>
              <h1 className="mt-6 font-display text-3xl font-semibold">{welcome}</h1>
              <p className="mt-2 text-muted">Taking you to your first plan…</p>
            </div>
          ) : sent ? (
            <div className="text-center" role="status">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-soft text-4xl" aria-hidden>✉️</div>
              <h1 className="mt-6 font-display text-3xl font-semibold">{sent.title}</h1>
              <p className="mt-2 text-muted">{sent.body}</p>
              <button onClick={() => switchMode("signin")} className="mt-6 text-sm font-semibold text-brand hover:underline">← Back to sign in</button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                {mode === "signup" ? `Step ${sstep + 1} of 2` : mode === "magic" ? "Passwordless" : mode === "forgot" ? "Password reset" : "Sign in"}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                {mode === "signin" && "Good to see you again"}
                {mode === "signup" && (sstep === 0 ? "First, who are you?" : `Nice to meet you, ${first || "friend"}`)}
                {mode === "magic" && "Skip the password"}
                {mode === "forgot" && "Forgot your password?"}
              </h1>
              <p className="mt-2 text-muted">
                {mode === "signin" && "Sign in to see your saved events."}
                {mode === "signup" && (sstep === 0 ? "Pick a name and a color. It's how you'll appear on your plans." : "Last step: how should we reach you?")}
                {mode === "magic" && "We'll email you a one-time link. No password to remember."}
                {mode === "forgot" && "Enter your email and we'll send a link to choose a new one."}
              </p>

              {!enabled && ready && <p role="status" className="mt-5 rounded-xl bg-warn/10 p-3 text-sm text-warn">Accounts aren&apos;t available right now. You can still plan events as a guest.</p>}

              {mode === "signin" && google && enabled && (
                <>
                  <Button variant="secondary" size="lg" className="mt-6 w-full" onClick={async () => { const r = await signInWithGoogle(); if (!r.ok) setError(r.message); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z"/></svg>
                    Continue with Google
                  </Button>
                  <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
                </>
              )}

              <form onSubmit={submit} className="mt-7 flex flex-col gap-4" noValidate>
                {mode === "signup" && sstep === 0 && (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar name={name || "?"} size={64} color={color} />
                      <Field label="Your name" htmlFor="name">
                        <input id="name" autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" maxLength={60} />
                      </Field>
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">Your color</legend>
                      <div className="flex gap-3" role="radiogroup" aria-label="Your color">
                        {AVATAR_COLORS.map((c) => (
                          <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Color ${c}`} onClick={() => setColor(c)}
                            className={`size-10 rounded-full transition ${color === c ? "scale-110 ring-4 ring-offset-2 ring-offset-bg" : "hover:scale-105"}`} style={{ background: c, boxShadow: color === c ? `0 0 0 3px ${c}55` : undefined }} />
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}

                {(mode !== "signup" || sstep === 1) && (
                  <Field label="Email" htmlFor="email">
                    <input id="email" type="email" autoFocus={mode !== "signup"} className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
                  </Field>
                )}

                {(mode === "signin" || (mode === "signup" && sstep === 1)) && (
                  <Field label="Password" htmlFor="password">
                    <div className="relative">
                      <input id="password" type={show ? "text" : "password"} className={`${inputCls} pr-16`} value={password} onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-fg">{show ? "Hide" : "Show"}</button>
                    </div>
                    {mode === "signup" && (
                      <div className="mt-2" aria-live="polite">
                        <div className="flex gap-1.5" aria-hidden>
                          {[1, 2, 3, 4].map((i) => (
                            <span key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: st.score >= i ? ["", "var(--accent)", "var(--warn)", "var(--good)", "var(--brand)"][i] : "var(--border)" }} />
                          ))}
                        </div>
                        <div className="mt-1.5 flex justify-between text-xs"><span className="font-semibold">{st.label}</span><span className="text-muted">{st.tip}</span></div>
                      </div>
                    )}
                  </Field>
                )}

                {mode === "signin" && (
                  <div className="-mt-1 flex items-center justify-between text-sm">
                    <button type="button" onClick={() => switchMode("magic")} className="font-medium text-brand hover:underline">Email me a link instead</button>
                    <button type="button" onClick={() => switchMode("forgot")} className="font-medium text-muted hover:text-fg hover:underline">Forgot password?</button>
                  </div>
                )}

                {error && <p role="alert" className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}
                <Button type="submit" size="lg" disabled={busy || (!enabled && !(mode === "signup" && sstep === 0))} className="mt-1">
                  {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? (sstep === 0 ? "Continue →" : "Create my account") : mode === "magic" ? "Email me a sign-in link" : "Send reset link"}
                </Button>
                {mode === "signup" && sstep === 1 && <button type="button" onClick={() => setSstep(0)} className="text-sm font-medium text-muted hover:text-fg">← Back</button>}
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                {mode === "signin" && <>New to Gatherly? <button onClick={() => switchMode("signup")} className="font-semibold text-brand hover:underline">Create an account</button></>}
                {mode === "signup" && <>Already have an account? <button onClick={() => switchMode("signin")} className="font-semibold text-brand hover:underline">Sign in</button></>}
                {(mode === "forgot" || mode === "magic") && <button onClick={() => switchMode("signin")} className="font-semibold text-brand hover:underline">← Back to sign in</button>}
              </p>

              <div className="mt-8 border-t border-border pt-6 text-center">
                <Button variant="ghost" className="w-full" onClick={() => router.push("/plan")}>Continue as guest →</Button>
                <p className="mt-2 text-xs text-muted">Guest events stay on this device. <Link href="/events" className="underline">My events</Link></p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
