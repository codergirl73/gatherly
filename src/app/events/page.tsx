"use client";
import Link from "next/link";
import { deleteRun, useRuns, useUser } from "@/lib/client/store";
import { AvatarStack } from "@/components/Avatar";
import { Badge, Card, LinkButton } from "@/components/ui";

export default function EventsPage() {
  const runs = useRuns();
  const { user } = useUser();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">My events</h1>
          <p className="mt-2 text-muted">{user ? `Saved for ${user.name} in this browser.` : "Saved in this browser. Sign in to put your name on them."}</p>
        </div>
        <LinkButton href="/plan">New event</LinkButton>
      </div>
      {runs.length === 0 ? (
        <Card className="mt-10 py-14 text-center">
          <div className="text-5xl" aria-hidden>🗓️</div>
          <h2 className="mt-4 font-display text-xl font-semibold">No events yet</h2>
          <p className="mt-1 text-muted">Plan your first one in about two minutes.</p>
          <div className="mt-6 flex justify-center gap-3"><LinkButton href="/plan">Plan an event</LinkButton><LinkButton href="/#demo" variant="secondary">Try a demo group</LinkButton></div>
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {runs.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/run/${r.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-display text-lg font-semibold">{r.plan?.title ?? `${r.input.eventType} in ${r.input.city}`}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Badge tone={r.status === "done" ? "good" : r.status === "error" ? "warn" : "brand"}>{r.status === "done" ? "Ready" : r.status === "error" ? "Failed" : "Planning…"}</Badge>
                    <span>{r.input.city}</span><span>·</span><span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <AvatarStack names={r.input.people.map((p) => p.name)} />
                  <button onClick={() => deleteRun(r.id)} className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-accent" aria-label="Delete event">Delete</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
