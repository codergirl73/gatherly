"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUDGETS, EVENT_TYPES, groupInputSchema, type GroupInput } from "@/lib/schemas";
import { PRESETS } from "@/lib/presets";
import { Avatar } from "./Avatar";
import { Button, Card, inputCls } from "./ui";
import { startRun } from "./PresetButton";
import { CATEGORY_EMOJI, FavoritePicker, type Favorite } from "./FavoritePicker";
import { TasteConstellation } from "./TasteConstellation";
import { Tilt } from "./Tilt";

type Person = GroupInput["people"][number];

const blankPerson = (): Person => ({ name: "", favorites: [] });

const initial = (): GroupInput => ({
  eventType: "team social",
  city: "",
  budget: "$$",
  constraints: "",
  people: [blankPerson(), blankPerson(), blankPerson()],
});

const EVENT_META: Record<(typeof EVENT_TYPES)[number], { emoji: string; blurb: string }> = {
  "team social": { emoji: "💼", blurb: "Coworkers, one good evening" },
  birthday: { emoji: "🎂", blurb: "Make it feel personal" },
  offsite: { emoji: "🌍", blurb: "A team getting together" },
  "friends night out": { emoji: "🥂", blurb: "Just for fun" },
};
const BUDGET_META = { $: "Casual", $$: "Nice", $$$: "Special", $$$$: "Splurge" } as const;
const CITIES = ["New York", "London", "Lisbon", "Paris", "Tokyo", "Los Angeles"];
const NEEDS = ["Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Nut allergy", "No alcohol", "Step-free access"];
const STEPS = ["The night", "The crew", "Ready"];
const MIN_FAVS = 3;
const MAX_FAVS = 6;

export function GroupBuilder() {
  const router = useRouter();
  const [g, setG] = useState<GroupInput>(initial);
  const [needs, setNeeds] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState(0);

  const patch = (p: Partial<GroupInput>) => setG((s) => ({ ...s, ...p }));
  const setPerson = (i: number, fn: (p: Person) => Person) => setG((s) => ({ ...s, people: s.people.map((p, j) => (j === i ? fn(p) : p)) }));

  const constraintsText = () => [...needs, g.constraints?.trim()].filter(Boolean).join(". ");
  const cleaned = (): GroupInput => ({
    ...g,
    constraints: constraintsText() || undefined,
    people: g.people.map((p) => ({ ...p, name: p.name.trim() })),
  });

  const problemsFor = (which: number): string[] => {
    const c = cleaned();
    const out: string[] = [];
    if (c.city.trim().length < 2) out.push("Tell us which city the night is in.");
    if (which >= 1) {
      c.people.forEach((p, i) => {
        if (!p.name) out.push(`Give person ${i + 1} a name.`);
        else if (p.favorites.length < MIN_FAVS) out.push(`${p.name} needs at least ${MIN_FAVS} favorites (${p.favorites.length} so far).`);
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
    if (n > step) {
      const p = problemsFor(Math.min(step, 1));
      setErrors(p);
      if (p.length) return window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setErrors([]);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setG(structuredClone(p.group));
    setNeeds([]);
    setSel(0);
    setErrors([]);
    setStep(2);
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

  const addFav = (i: number, f: Favorite) =>
    setPerson(i, (p) =>
      p.favorites.length >= MAX_FAVS || p.favorites.some((x) => x.entityId && x.entityId === f.entityId) || p.favorites.some((x) => !x.entityId && !f.entityId && x.name.toLowerCase() === f.name.toLowerCase())
        ? p
        : { ...p, favorites: [...p.favorites, f] },
    );

  const person = g.people[sel] ?? g.people[0];
  const taken = new Set(person.favorites.flatMap((f) => (f.entityId ? [f.entityId] : [])));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <Stepper step={step} onGo={(n) => (n <= step ? goTo(n) : undefined)} />

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <ul className="list-disc space-y-0.5 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {/* ---------- Step 1: the night ---------- */}
      {step === 0 && (
        <div className="flex flex-col gap-10 rise">
          <section aria-labelledby="crews">
            <h2 id="crews" className="text-sm font-semibold text-muted">In a hurry? Start with a crew</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {PRESETS.map((p) => (
                <Tilt key={p.id} className="rounded-2xl">
                  <button type="button" onClick={() => loadPreset(p.id)} className="h-full w-full rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-brand hover:shadow-md">
                    <div className="text-2xl" aria-hidden>{p.emoji}</div>
                    <div className="mt-2 font-semibold leading-snug">{p.label}</div>
                    <div className="mt-0.5 text-xs text-muted">{p.group.people.length} people</div>
                  </button>
                </Tilt>
              ))}
            </div>
          </section>

          <section aria-labelledby="kind">
            <h2 id="kind" className="font-display text-2xl font-semibold">What are we planning?</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-labelledby="kind">
              {EVENT_TYPES.map((t) => (
                <Tilt key={t} className="rounded-2xl">
                  <button type="button" role="radio" aria-checked={g.eventType === t} onClick={() => patch({ eventType: t })}
                    className={`h-full w-full rounded-2xl border p-4 text-left transition ${g.eventType === t ? "border-brand bg-brand-soft ring-2 ring-brand/30" : "border-border bg-surface hover:border-brand/50"}`}>
                    <div className="text-3xl" aria-hidden>{EVENT_META[t].emoji}</div>
                    <div className="mt-2 font-semibold capitalize">{t}</div>
                    <div className="text-xs text-muted">{EVENT_META[t].blurb}</div>
                  </button>
                </Tilt>
              ))}
            </div>
          </section>

          <section aria-labelledby="where" className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 id="where" className="font-display text-2xl font-semibold">Where?</h2>
              <input aria-labelledby="where" className={`${inputCls} mt-4 !py-3.5 text-lg`} value={g.city} onChange={(e) => patch({ city: e.target.value })} placeholder="Type a city…" autoComplete="off" />
              <div className="mt-3 flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button key={c} type="button" onClick={() => patch({ city: c })} className={`rounded-full border px-3 py-1.5 text-sm transition ${g.city === c ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface hover:border-brand/50"}`}>{c}</button>
                ))}
              </div>
              <label className="mt-6 block text-sm font-semibold" htmlFor="date">When? <span className="font-normal text-muted">(optional)</span></label>
              <input id="date" type="date" className={`${inputCls} mt-2`} value={g.date ?? ""} onChange={(e) => patch({ date: e.target.value })} />
            </div>
            <div>
              <h2 id="spend" className="font-display text-2xl font-semibold">What&apos;s the vibe on spend?</h2>
              <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="spend">
                {BUDGETS.map((b) => (
                  <button key={b} type="button" role="radio" aria-checked={g.budget === b} onClick={() => patch({ budget: b })}
                    className={`rounded-2xl border px-2 py-3 text-center transition ${g.budget === b ? "border-brand bg-brand-soft ring-2 ring-brand/30" : "border-border bg-surface hover:border-brand/50"}`}>
                    <div className="font-display text-xl font-semibold">{b}</div>
                    <div className="text-xs text-muted">{BUDGET_META[b]}</div>
                  </button>
                ))}
              </div>
              <h3 className="mt-8 text-sm font-semibold">Anything we must respect? <span className="font-normal text-muted">(optional)</span></h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {NEEDS.map((n) => {
                  const on = needs.includes(n);
                  return (
                    <button key={n} type="button" aria-pressed={on} onClick={() => setNeeds((x) => (on ? x.filter((y) => y !== n) : [...x, n]))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-brand bg-brand text-brand-fg" : "border-border bg-surface hover:border-brand/50"}`}>{on ? "✓ " : ""}{n}</button>
                  );
                })}
              </div>
              <input aria-label="Other constraints" className={`${inputCls} mt-3`} value={g.constraints ?? ""} onChange={(e) => patch({ constraints: e.target.value })} maxLength={200} placeholder="Anything else? e.g. one person can't do stairs" />
              <p className="mt-2 text-xs text-muted">We only use what you tell us here. We never guess from taste.</p>
            </div>
          </section>
        </div>
      )}

      {/* ---------- Step 2: the crew ---------- */}
      {step === 1 && (
        <div className="grid gap-6 rise lg:grid-cols-[19rem_1fr]">
          <aside className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">Who&apos;s coming?</h2>
              <p className="mt-1 text-sm text-muted">Add everyone, then tell us what each person loves. Use made-up or example people.</p>
            </div>
            <ul className="flex flex-col gap-2" aria-label="People">
              {g.people.map((p, i) => {
                const done = p.favorites.length >= MIN_FAVS;
                return (
                  <li key={i}>
                    <div className={`flex items-center gap-3 rounded-2xl border p-2.5 transition ${sel === i ? "border-brand bg-brand-soft ring-2 ring-brand/25" : "border-border bg-surface"}`}>
                      <button type="button" onClick={() => setSel(i)} aria-label={`Edit ${p.name || `person ${i + 1}`}`} className="relative shrink-0">
                        <Avatar name={p.name || "?"} size={40} />
                        {done && <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-good text-[9px] font-bold text-white ring-2 ring-surface">✓</span>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <input aria-label={`Person ${i + 1} name`} value={p.name} maxLength={40} onFocus={() => setSel(i)}
                          onChange={(e) => setPerson(i, (x) => ({ ...x, name: e.target.value }))} placeholder={`Person ${i + 1}`}
                          className="w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted/70" />
                        <div className="text-xs text-muted">{p.favorites.length}/{MIN_FAVS}+ favorites</div>
                      </div>
                      {g.people.length > 2 && (
                        <button type="button" aria-label={`Remove ${p.name || `person ${i + 1}`}`} onClick={() => { setG((s) => ({ ...s, people: s.people.filter((_, j) => j !== i) })); setSel(0); }} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-accent">✕</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {g.people.length < 6 && (
              <Button type="button" variant="secondary" onClick={() => { setG((s) => ({ ...s, people: [...s.people, blankPerson()] })); setSel(g.people.length); }}>+ Add a person</Button>
            )}
            <div className="hidden lg:block">
              <TasteConstellation names={g.people.map((p, i) => p.name.trim() || `P${i + 1}`)} phase={0} className="mx-auto max-w-[15rem] opacity-90" />
            </div>
          </aside>

          <section aria-live="polite">
            <Card className="!p-5 sm:!p-7">
              <div className="flex items-center gap-3">
                <Avatar name={person.name || "?"} size={44} />
                <div>
                  <h3 className="font-display text-2xl font-semibold">What does {person.name.trim() || `person ${sel + 1}`} love?</h3>
                  <p className="text-sm text-muted">Search anything: films, shows, artists, restaurants, places, brands, books.</p>
                </div>
              </div>
              <div className="mt-5">
                <FavoritePicker onPick={(f) => addFav(sel, f)} taken={taken} disabled={person.favorites.length >= MAX_FAVS}
                  placeholder={person.favorites.length >= MAX_FAVS ? "That's plenty! Remove one to add another." : "Try “Radiohead”, “Severance”, “Dishoom”…"} />
              </div>

              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {person.favorites.map((f, k) => (
                  <li key={f.name + k} className="rise flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-2 pr-3">
                    {f.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote Qloo thumbnails
                      <img src={f.image} alt="" className="size-10 rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <span className="grid size-10 place-items-center rounded-lg bg-surface text-lg">{CATEGORY_EMOJI[f.category]}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.name}</span>
                      <span className="block text-xs text-muted">{CATEGORY_EMOJI[f.category]} {f.category}{f.entityId ? " · matched" : ""}</span>
                    </span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setPerson(sel, (p) => ({ ...p, favorites: p.favorites.filter((_, j) => j !== k) }))} className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface hover:text-accent">✕</button>
                  </li>
                ))}
                {Array.from({ length: Math.max(0, MIN_FAVS - person.favorites.length) }).map((_, i) => (
                  <li key={`empty${i}`} className="flex h-14 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted">+ Add a favorite</li>
                ))}
              </ul>

              {g.people.length > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="text-muted">{person.favorites.length >= MIN_FAVS ? "Nice. That's enough to go on." : `${MIN_FAVS - person.favorites.length} more to go`}</span>
                  {sel < g.people.length - 1 && <button type="button" onClick={() => setSel(sel + 1)} className="font-semibold text-brand hover:underline">Next person →</button>}
                </div>
              )}
            </Card>
          </section>
        </div>
      )}

      {/* ---------- Step 3: ready ---------- */}
      {step === 2 && <Review g={cleaned()} onEdit={goTo} />}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-bg/90 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? <Button type="button" variant="ghost" onClick={() => goTo(step - 1)}>← Back</Button> : <p className="hidden text-sm text-muted sm:block">Takes about a minute. Gatherly never books or pays for anything.</p>}
          <Button type="submit" size="lg" className="ml-auto">{step === 0 ? "Next: the crew →" : step === 1 ? "Review →" : "Plan our night →"}</Button>
        </div>
      </div>
    </form>
  );
}

function Stepper({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <button type="button" onClick={() => onGo(i)} disabled={i > step} aria-current={i === step ? "step" : undefined} className="flex items-center gap-2 rounded-full disabled:cursor-default">
            <span className={`grid size-8 place-items-center rounded-full text-sm font-bold transition ${i < step ? "bg-good text-white" : i === step ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted"}`}>{i < step ? "✓" : i + 1}</span>
            <span className={`hidden text-sm font-semibold sm:inline ${i === step ? "text-fg" : "text-muted"}`}>{label}</span>
          </button>
          {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-good" : "bg-border"}`} />}
        </li>
      ))}
    </ol>
  );
}

function Review({ g, onEdit }: { g: GroupInput; onEdit: (n: number) => void }) {
  return (
    <div className="grid gap-6 rise lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">Ready when you are</h2>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand">The night</div>
              <h3 className="mt-1 font-display text-2xl font-semibold capitalize">{EVENT_META[g.eventType].emoji} {g.eventType} in {g.city}</h3>
            </div>
            <button type="button" onClick={() => onEdit(0)} className="text-sm font-semibold text-brand hover:underline">Edit</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-surface-2 px-3 py-1">Budget {g.budget} · {BUDGET_META[g.budget]}</span>
            {g.date && <span className="rounded-full bg-surface-2 px-3 py-1">{g.date}</span>}
            <span className="rounded-full bg-surface-2 px-3 py-1">{g.people.length} people</span>
          </div>
          {g.constraints && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm"><strong>We&apos;ll respect: </strong>{g.constraints}</p>}
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">The crew</div>
            <button type="button" onClick={() => onEdit(1)} className="text-sm font-semibold text-brand hover:underline">Edit</button>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {g.people.map((p) => (
              <li key={p.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={p.name} size={32} />
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.favorites.map((f) => <span key={f.name + f.category} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{CATEGORY_EMOJI[f.category]} {f.name}</span>)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-3xl border border-border bg-surface p-5 text-center shadow-sm">
          <TasteConstellation names={g.people.map((p) => p.name)} className="mx-auto max-w-[14rem]" />
          <p className="mt-2 text-sm text-muted">Gatherly will find what {g.people.length} different tastes have in common, then plan around it.</p>
        </div>
      </aside>
    </div>
  );
}
