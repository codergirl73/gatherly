"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRun, useRuns, type Run } from "@/lib/client/store";
import { useUser } from "@/lib/client/auth";
import { AvatarStack } from "@/components/Avatar";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { startRun } from "@/components/PresetButton";

const EMOJI: Record<string, string> = { "team social": "💼", birthday: "🎂", offsite: "🌍", "friends night out": "🥂" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function when(ms: number) {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function EventCard({ run }: { run: Run }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { input, plan } = run;
  const title = plan?.title ?? `${cap(input.eventType)} in ${input.city}`;
  const done = run.status === "done";
  const failed = run.status === "error";

  return (
    <Card className="group flex flex-col gap-4 p-5 transition hover:border-brand/50 hover:shadow-md sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl" aria-hidden>{EMOJI[input.eventType] ?? "🎉"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/run/${run.id}`} className="truncate font-display text-xl font-semibold after:absolute after:inset-0 hover:text-brand">{title}</Link>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <Badge tone={done ? "good" : failed ? "warn" : "brand"}>{done ? "Ready" : failed ? "Didn't finish" : "Planning…"}</Badge>
            <span>{cap(input.eventType)}</span>
            <span aria-hidden>·</span>
            <span>{input.city}</span>
            <span aria-hidden>·</span>
            <span>{when(run.createdAt)}</span>
          </div>
        </div>
        <AvatarStack names={input.people.map((p) => p.name)} />
      </div>

      {done && plan && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {[`🍽️ ${plan.venue.name}`, `📍 ${plan.activity.name}`, plan.film ? `🎬 ${plan.film.name}` : null].filter(Boolean).map((t) => (
            <li key={t} className="rounded-full bg-surface-2 px-3 py-1.5">{t}</li>
          ))}
        </ul>
      )}
      {failed && <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{run.error?.message ?? "This plan didn't finish."}</p>}

      <div className="relative z-10 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted">{input.people.length} people · Budget {input.budget}</span>
        <div className="flex items-center gap-2">
          {failed && <Button variant="secondary" onClick={() => startRun(router, input)}>Try again</Button>}
          {confirming ? (
            <>
              <span className="text-sm text-muted">Delete this event?</span>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
              <Button variant="secondary" className="!text-accent" onClick={() => deleteRun(run.id)}>Delete</Button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirming(true)} className="rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-accent" aria-label={`Delete ${title}`}>Delete</button>
              {!failed && <LinkButton href={`/run/${run.id}`} variant="secondary">{done ? "Open plan" : "View progress"}</LinkButton>}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function EventsPage() {
  const runs = useRuns();
  const { user } = useUser();
  const ready = runs.filter((r) => r.status === "done").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">My events</h1>
          <p className="mt-2 text-muted">
            {user ? `Saved to your account, ${user.name}.` : "Saved on this device."}
            {runs.length > 0 && ` ${runs.length} event${runs.length > 1 ? "s" : ""}, ${ready} ready.`}
          </p>
        </div>
        <LinkButton href="/plan">+ New event</LinkButton>
      </div>

      {!user && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand/25 bg-brand-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden>☁️</span>
            <p className="text-sm"><strong>Keep your events safe.</strong> <span className="text-muted">Guest events live only on this device. Sign in to save them to your account.</span></p>
          </div>
          <LinkButton href="/login" variant="primary" className="shrink-0 whitespace-nowrap">Sign in</LinkButton>
        </div>
      )}

      {runs.length === 0 ? (
        <Card className="mt-10 py-16 text-center">
          <div className="text-5xl" aria-hidden>🗓️</div>
          <h2 className="mt-4 font-display text-xl font-semibold">No events yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-muted">Plan your first one in about two minutes, or start from an example group.</p>
          <div className="mt-6 flex justify-center gap-3"><LinkButton href="/plan">Plan an event</LinkButton><LinkButton href="/#examples" variant="secondary">Try an example group</LinkButton></div>
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {runs.map((r) => <li key={r.id} className="relative"><EventCard run={r} /></li>)}
        </ul>
      )}
    </div>
  );
}
