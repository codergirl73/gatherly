"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { signIn } from "@/lib/client/store";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim() || email.split("@")[0];
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (!n) return setError("Tell us your name.");
    signIn({ name: n, email: email.trim() });
    router.push("/plan");
  };

  return (
    <div className="bg-hero">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <div className="hidden md:block">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            Welcome back to <span className="text-brand">Gatherly</span>.
          </h1>
          <p className="mt-4 text-lg text-muted">Keep your planned events in one place and pick up where you left off.</p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            {["Save and revisit every plan", "Re-run a group with a different city", "Share a plan as text in one click"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-5 place-items-center rounded-full bg-good/15 text-xs text-good">✓</span>{t}</li>
            ))}
          </ul>
        </div>

        <Card className="rise">
          <div className="mb-6 grid grid-cols-2 rounded-full bg-surface-2 p-1 text-sm font-semibold" role="tablist">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={`rounded-full py-2 transition ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}>
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            {mode === "signup" && (
              <Field label="Your name" htmlFor="name">
                <input id="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input id="email" type="email" className={inputCls} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" autoComplete="email" />
            </Field>
            {error && <p role="alert" className="text-sm text-accent">{error}</p>}
            <Button type="submit" size="lg">{mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button variant="secondary" className="w-full" onClick={() => router.push("/plan")}>Continue as guest</Button>
          <p className="mt-5 rounded-xl bg-surface-2 p-3 text-xs text-muted">
            <strong className="text-fg">Private by design.</strong> Gatherly doesn&apos;t use passwords. Your name and saved events stay on this device, and we don&apos;t store them on our servers.
          </p>
        </Card>
      </div>
    </div>
  );
}
