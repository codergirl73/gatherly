"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { updatePassword, useUser } from "@/lib/client/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, ready } = useUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const r = await updatePassword(password);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setDone(true);
    setTimeout(() => router.push("/plan"), 1500);
  };

  return (
    <div className="bg-hero">
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card className="rise">
          <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
          {!ready ? (
            <p className="mt-4 text-sm text-muted">Checking your link…</p>
          ) : !user ? (
            <div className="mt-4 text-sm text-muted">
              <p>This reset link is invalid or has expired.</p>
              <Link href="/login" className="mt-3 inline-block font-medium text-brand hover:underline">Request a new link</Link>
            </div>
          ) : done ? (
            <p role="status" className="mt-4 rounded-xl bg-good/10 p-3 text-sm text-good">Password updated. Taking you to Gatherly…</p>
          ) : (
            <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
              <Field label="New password" htmlFor="pw" hint="At least 8 characters.">
                <input id="pw" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label="Confirm password" htmlFor="pw2">
                <input id="pw2" type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </Field>
              {error && <p role="alert" className="text-sm text-accent">{error}</p>}
              <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
