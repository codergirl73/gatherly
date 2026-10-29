import type { ReactNode } from "react";
import type { Plan } from "@/lib/schemas";
import { AvatarStack } from "./Avatar";
import { Badge, Card } from "./ui";

interface Props {
  plan: Plan;
  evidence?: Record<string, string[]>;
  /** "qloo": picks are verified against Qloo results. "llm": ungrounded baseline. */
  mode: "qloo" | "llm";
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} className="rise scroll-mt-36">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand">{kicker}</div>
      <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </Card>
  );
}

function Why({ why, fits, evidence, mode }: { why: string; fits: string[]; evidence?: string[]; mode: Props["mode"] | "none" }) {
  return (
    <>
      <p className="text-[15px] leading-relaxed">{why}</p>
      <div className="flex flex-wrap items-center gap-2">
        {fits.length > 0 && <><AvatarStack names={fits} /><span className="text-xs text-muted">Fits {fits.join(", ")}</span></>}
        {mode === "qloo" ? <Badge tone="good">✓ From Qloo</Badge> : mode === "llm" ? <Badge tone="warn">Unverified</Badge> : null}
      </div>
      {mode === "qloo" && evidence && evidence.length > 0 && (
        <details className="group rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none font-medium text-muted group-open:text-fg">Why Qloo matched this</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{evidence.map((e) => <li key={e}>{e}</li>)}</ul>
        </details>
      )}
    </>
  );
}

export function PlanView({ plan, evidence = {}, mode }: Props) {
  const ev = (id?: string) => (id ? evidence[id] : undefined);
  return (
    <div className="flex flex-col gap-4">
      <Section id="theme" kicker="Theme" title={plan.theme.name}>
        <p className="text-muted">{plan.theme.description}</p>
        <Why why={plan.theme.why} fits={plan.theme.fits} mode="none" />
      </Section>

      <Section id="venue" kicker="Venue & cuisine" title={plan.venue.name}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{plan.venue.cuisine}</Badge>
          <Badge tone="warn">Check hours, prices & availability before booking</Badge>
        </div>
        {plan.venue.address && <p className="text-sm text-muted">📍 {plan.venue.address}</p>}
        <Why why={plan.venue.why} fits={plan.venue.fits} evidence={ev(plan.venue.entityId)} mode={mode} />
      </Section>

      <Section id="playlist" kicker="Playlist" title="The sound of the night">
        <p className="text-muted">{plan.playlist.direction}</p>
        <ul className="flex flex-col divide-y divide-border">
          {plan.playlist.artists.map((a) => (
            <li key={a.name} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="font-semibold">🎵 {a.name}</div>
              <Why why={a.why} fits={a.fits} evidence={ev(a.entityId)} mode={mode} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="activity" kicker="Activity" title={plan.activity.name}>
        {plan.activity.address && <p className="text-sm text-muted">📍 {plan.activity.address}</p>}
        <Badge tone="warn">Check hours & availability before booking</Badge>
        <Why why={plan.activity.why} fits={plan.activity.fits} evidence={ev(plan.activity.entityId)} mode={mode} />
      </Section>

      {plan.film && (
        <Section id="film" kicker="Film" title={plan.film.name}>
          <Why why={plan.film.why} fits={plan.film.fits} evidence={ev(plan.film.entityId)} mode={mode} />
        </Section>
      )}

      {plan.tradeoffs.length > 0 && (
        <Card className="border-warn/40 bg-warn/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-warn">Tradeoffs</div>
          <ul className="mt-3 flex flex-col gap-4">
            {plan.tradeoffs.map((t, i) => (
              <li key={i} className="flex flex-col gap-2">
                <p>{t.note}</p>
                {t.between.length > 0 && <AvatarStack names={t.between} />}
                <p className="rounded-xl bg-surface p-3 text-sm"><strong>Balanced alternative: </strong>{t.balancedAlternative}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.constraintsNote && (
        <Card className="bg-surface-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Your constraints</div>
          <p className="mt-2 text-sm">{plan.constraintsNote}</p>
        </Card>
      )}
    </div>
  );
}

export function planToText(plan: Plan, city: string): string {
  const lines = [
    `${plan.title} (${city})`,
    plan.summary,
    "",
    `Theme: ${plan.theme.name}. ${plan.theme.description}`,
    `Venue: ${plan.venue.name} (${plan.venue.cuisine})${plan.venue.address ? ", " + plan.venue.address : ""}. ${plan.venue.why}`,
    `Playlist: ${plan.playlist.artists.map((a) => a.name).join(", ")}. ${plan.playlist.direction}`,
    `Activity: ${plan.activity.name}. ${plan.activity.why}`,
    plan.film ? `Film: ${plan.film.name}. ${plan.film.why}` : "",
    ...plan.tradeoffs.map((t) => `Tradeoff: ${t.note} Balanced alternative: ${t.balancedAlternative}`),
    "",
    "Check hours, prices and availability before booking. Planned with Gatherly.",
  ];
  return lines.filter((l, i) => l || lines[i - 1]).join("\n");
}

/** Four tiles summarising the plan, each jumping to its full card. */
export function AtAGlance({ plan }: { plan: Plan }) {
  const tiles = [
    { id: "venue", icon: "🍽️", label: "Eat & drink", value: plan.venue.name, sub: plan.venue.cuisine },
    { id: "activity", icon: "📍", label: "Do", value: plan.activity.name, sub: plan.activity.address ?? "" },
    { id: "playlist", icon: "🎵", label: "Listen", value: plan.playlist.artists.slice(0, 2).map((a) => a.name).join(", "), sub: `+${Math.max(0, plan.playlist.artists.length - 2)} more artists` },
    ...(plan.film ? [{ id: "film", icon: "🎬", label: "Watch", value: plan.film.name, sub: "Film pick" }] : []),
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Plan at a glance">
      {tiles.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`} className="group flex h-full flex-col gap-1 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><span aria-hidden>{t.icon}</span>{t.label}</span>
            <span className="font-display text-lg font-semibold leading-snug">{t.value}</span>
            {t.sub && <span className="line-clamp-1 text-sm text-muted">{t.sub}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
