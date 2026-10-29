"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUDGETS, CATEGORIES, CATEGORY_LABELS, EVENT_TYPES, groupInputSchema, type GroupInput } from "@/lib/schemas";
import { PRESETS } from "@/lib/presets";
import { Avatar } from "./Avatar";
import { Button, Card, Field, inputCls } from "./ui";
import { startRun } from "./PresetButton";
import { useUser } from "@/lib/client/auth";

const blankPerson = (): GroupInput["people"][number] => ({
  name: "",
  favorites: [
    { name: "", category: "music" },
    { name: "", category: "film" },
    { name: "", category: "food" },
  ],
});

const initial = (): GroupInput => ({
  eventType: "team social",
  city: "",
  budget: "$$",
  constraints: "",
  people: [blankPerson(), blankPerson(), blankPerson()],
});

const PLACEHOLDERS: Record<string, string> = {
  film: "e.g. Dune", tv: "e.g. Severance", music: "e.g. Radiohead", food: "e.g. Dishoom or ramen", place: "e.g. The Strand", brand: "e.g. Muji", book: "e.g. Norwegian Wood",
};

export function GroupBuilder() {
  const router = useRouter();
  const { user } = useUser();
  const [g, setG] = useState<GroupInput>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const patch = (p: Partial<GroupInput>) => setG((s) => ({ ...s, ...p }));
  const setPerson = (i: number, fn: (p: GroupInput["people"][number]) => GroupInput["people"][number]) =>
    setG((s) => ({ ...s, people: s.people.map((p, j) => (j === i ? fn(p) : p)) }));

  const cleaned = (): GroupInput => ({
    ...g,
    constraints: g.constraints?.trim() || undefined,
    people: g.people.map((p) => ({ ...p, name: p.name.trim(), favorites: p.favorites.filter((f) => f.name.trim()) })),
  });

  const problemsFor = (which: number): string[] => {
    const c = cleaned();
    const out: string[] = [];
    if (which >= 0 && c.city.trim().length < 2) out.push("Enter the city for the event.");
    if (which >= 1) {
      c.people.forEach((p, i) => {
        if (!p.name) out.push(`Person ${i + 1} needs a name.`);
        else if (p.favorites.length < 3) out.push(`${p.name} needs at least 3 favorites.`);
      });
      const names = c.people.map((p) => p.name.toLowerCase());
      if (new Set(names).size !== names.length) out.push("Each person needs a different name.");
    }
    if (!out.length && which >= 1) {
      const r = groupInputSchema.safeParse(c);
      if (!r.success) out.push(r.error.issues[0].message);
    }
    return out;
  };

  const goTo = (n: number) => {
    // Moving forward validates the steps being left; moving back is always allowed.
    if (n > step) {
      const p = problemsFor(Math.min(step, 1));
      setErrors(p);
      if (p.length) return window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setErrors([]);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) return goTo(step + 1);
    const p = problemsFor(1);
    setErrors(p);
    if (p.length) return window.scrollTo({ top: 0, behavior: "smooth" });
    startRun(router, cleaned());
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <Stepper step={step} onGo={(n) => (n <= step ? goTo(n) : undefined)} />

      {step === 0 && <div>
        <p className="mb-2 text-sm font-medium text-muted">Start from an example</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => { setG(structuredClone(p.group)); setErrors([]); }}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:border-brand hover:bg-brand-soft">
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>}

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-semibold">A few things to fix:</p>
          <ul className="mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {step === 0 && <Card className="rise">
        <h2 className="font-display text-xl font-semibold">The event</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Event type" htmlFor="type">
            <select id="type" className={inputCls} value={g.eventType} onChange={(e) => patch({ eventType: e.target.value as GroupInput["eventType"] })}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="City" htmlFor="city" hint="Venues and activities are searched here.">
            <input id="city" className={inputCls} value={g.city} onChange={(e) => patch({ city: e.target.value })} placeholder="e.g. Lisbon" autoComplete="off" />
          </Field>
          <Field label="Date (optional)" htmlFor="date">
            <input id="date" type="date" className={inputCls} value={g.date ?? ""} onChange={(e) => patch({ date: e.target.value })} />
          </Field>
          <Field label="Budget per person" hint="Used to filter restaurant price level.">
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Budget">
              {BUDGETS.map((b) => (
                <button key={b} type="button" role="radio" aria-checked={g.budget === b} onClick={() => patch({ budget: b })}
                  className={`rounded-lg py-2 text-sm font-semibold transition ${g.budget === b ? "bg-surface shadow-sm text-brand" : "text-muted"}`}>{b}</button>
              ))}
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Constraints (optional)" htmlFor="constraints" hint="Dietary needs, accessibility, etc. We only use what you write here, and never guess from taste.">
              <textarea id="constraints" rows={2} maxLength={300} className={inputCls} value={g.constraints ?? ""} onChange={(e) => patch({ constraints: e.target.value })} placeholder="e.g. One vegetarian. Step-free access needed." />
            </Field>
          </div>
        </div>
      </Card>}

      {step === 1 && <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Who&apos;s coming</h2>
            <p className="text-sm text-muted">3–5 favorites each works best. Use synthetic or example people only.</p>
          </div>
          <span className="text-sm text-muted">{g.people.length}/6 people</span>
        </div>

        {g.people.map((p, i) => (
          <Card key={i} className="rise">
            <div className="flex items-center gap-3">
              <Avatar name={p.name || "?"} size={36} />
              <input aria-label={`Person ${i + 1} name`} className={`${inputCls} max-w-xs font-semibold`} value={p.name} maxLength={40}
                onChange={(e) => setPerson(i, (x) => ({ ...x, name: e.target.value }))} placeholder={user && i === 0 ? user.name : `Person ${i + 1}`} />
              {g.people.length > 2 && (
                <button type="button" onClick={() => setG((s) => ({ ...s, people: s.people.filter((_, j) => j !== i) }))}
                  className="ml-auto rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-accent" aria-label={`Remove person ${i + 1}`}>Remove</button>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {p.favorites.map((f, k) => (
                <div key={k} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[9rem_1fr_auto]">
                  <select aria-label="Category" className={`${inputCls} col-span-2 sm:col-span-1`} value={f.category}
                    onChange={(e) => setPerson(i, (x) => ({ ...x, favorites: x.favorites.map((y, j) => (j === k ? { ...y, category: e.target.value as typeof f.category } : y)) }))}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                  <input aria-label="Favorite" className={inputCls} value={f.name} maxLength={80} placeholder={PLACEHOLDERS[f.category]}
                    onChange={(e) => setPerson(i, (x) => ({ ...x, favorites: x.favorites.map((y, j) => (j === k ? { ...y, name: e.target.value } : y)) }))} />
                  <button type="button" disabled={p.favorites.length <= 3} aria-label="Remove favorite"
                    onClick={() => setPerson(i, (x) => ({ ...x, favorites: x.favorites.filter((_, j) => j !== k) }))}
                    className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 disabled:opacity-30">✕</button>
                </div>
              ))}
            </div>
            {p.favorites.length < 6 && (
              <button type="button" onClick={() => setPerson(i, (x) => ({ ...x, favorites: [...x.favorites, { name: "", category: "tv" }] }))}
                className="mt-3 text-sm font-semibold text-brand hover:underline">+ Add a favorite</button>
            )}
          </Card>
        ))}

        {g.people.length < 6 && (
          <Button type="button" variant="secondary" className="self-start" onClick={() => setG((s) => ({ ...s, people: [...s.people, blankPerson()] }))}>+ Add a person</Button>
        )}
      </div>}

      {step === 2 && <Review g={cleaned()} onEdit={goTo} />}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-bg/90 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? <Button type="button" variant="ghost" onClick={() => goTo(step - 1)}>← Back</Button> : <p className="hidden text-sm text-muted sm:block">Takes about a minute. Gatherly never books or pays for anything.</p>}
          <Button type="submit" size="lg" className="ml-auto">{step < 2 ? "Continue →" : "Plan our event →"}</Button>
        </div>
      </div>
    </form>
  );
}

const STEPS = ["Event", "People", "Review"];

function Stepper({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <button type="button" onClick={() => onGo(i)} disabled={i > step} aria-current={i === step ? "step" : undefined}
            className="flex items-center gap-2 rounded-full disabled:cursor-default">
            <span className={`grid size-8 place-items-center rounded-full text-sm font-bold transition ${i < step ? "bg-good text-white" : i === step ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"}`}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={`text-sm font-semibold ${i === step ? "text-fg" : "text-muted"}`}>{label}</span>
          </button>
          {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-good" : "bg-border"}`} />}
        </li>
      ))}
    </ol>
  );
}

function Review({ g, onEdit }: { g: GroupInput; onEdit: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-4 rise">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">The event</div>
            <h2 className="mt-1 font-display text-2xl font-semibold capitalize">{g.eventType} in {g.city}</h2>
          </div>
          <button type="button" onClick={() => onEdit(0)} className="text-sm font-semibold text-brand hover:underline">Edit</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-surface-2 px-3 py-1">Budget {g.budget}</span>
          {g.date && <span className="rounded-full bg-surface-2 px-3 py-1">{g.date}</span>}
          <span className="rounded-full bg-surface-2 px-3 py-1">{g.people.length} people</span>
        </div>
        {g.constraints && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm"><strong>Constraints: </strong>{g.constraints}</p>}
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">The group</div>
          <button type="button" onClick={() => onEdit(1)} className="text-sm font-semibold text-brand hover:underline">Edit</button>
        </div>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {g.people.map((p) => (
            <li key={p.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar name={p.name} size={32} />
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.favorites.map((f) => <span key={f.name + f.category} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{f.name}</span>)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
