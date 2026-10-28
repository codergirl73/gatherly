import { LinkButton } from "@/components/ui";
import { PresetCard, DemoButton } from "@/components/PresetButton";
import { PRESETS } from "@/lib/presets";
import { Avatar } from "@/components/Avatar";

const steps = [
  { n: "1", t: "Tell us who's coming", d: "Add 3–6 people, a city and a budget. Everyone shares a few favorites: films, artists, restaurants, places." },
  { n: "2", t: "Qloo maps your tastes", d: "We resolve every favorite to Qloo's Taste AI and measure where the group overlaps and where it differs." },
  { n: "3", t: "Get a plan with reasons", d: "Venue, theme, playlist, activity and film. Each pick explains whose favorites it connects to, with tradeoffs flagged." },
];

const features = [
  { t: "Grounded, never invented", d: "Every venue, artist and film comes straight from Qloo. We reject any pick the model can't trace back to real data." },
  { t: "Overlap you can see", d: "A taste map shows what the whole group shares, what pairs share and what's uniquely yours." },
  { t: "Honest about conflict", d: "When tastes clash, Gatherly says so and offers a balanced alternative so nobody is the afterthought." },
  { t: "See Qloo's difference", d: "Flip the comparison to view the same group planned by an LLM alone, side by side." },
];

export default function Home() {
  const demo = PRESETS[0];
  return (
    <>
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-good" /> Powered by Qloo&apos;s Taste AI
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Plan the night <span className="text-brand">everyone</span> will actually enjoy.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Gatherly finds where your group&apos;s tastes overlap, then plans the venue, playlist and activity, with a reason behind every pick.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <DemoButton preset={demo} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-brand-fg shadow-sm transition hover:opacity-90">
                ✨ Try a demo group
              </DemoButton>
              <LinkButton href="/plan" variant="secondary" size="lg">Plan your own event</LinkButton>
            </div>
            <p className="mt-4 text-sm text-muted">No sign-up needed. Demo groups are synthetic people.</p>
          </div>

          <div className="rise relative" style={{ animationDelay: "120ms" }} aria-hidden>
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Taste overlap</span>
                <span className="rounded-full bg-good/15 px-2.5 py-1 text-xs font-semibold text-good">Strong match</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Atmospheric", "Cinematic", "Indie", "Melancholic", "Expressive"].map((t, i) => (
                  <span key={t} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand" style={{ opacity: 1 - i * 0.12 }}>{t}</span>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-surface-2 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted">Venue pick</div>
                <div className="mt-1 font-display text-xl font-semibold">Time Out Market</div>
                <p className="mt-1 text-sm text-muted">Lisbon · fits 4 of 5 people</p>
                <div className="mt-3 flex items-center gap-2">
                  {["Ana", "Liam", "Yuki", "Greta"].map((n) => <Avatar key={n} name={n} size={26} ring />)}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted">&ldquo;Yuki and Greta both love atmospheric, cinematic worlds, and Liam&apos;s indie taste lands here too.&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface p-6">
              <div className="grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-brand-fg">{s.n}</div>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-border bg-surface-2/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Try a demo group</h2>
          <p className="mt-2 max-w-2xl text-muted">One click runs the full agent on a synthetic group. It takes about a minute, and you can watch each step.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PRESETS.map((p) => <PresetCard key={p.id} preset={p} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Why Qloo makes the difference</h2>
        <p className="mt-2 max-w-2xl text-muted">An LLM alone guesses at venues and music. Gatherly asks Qloo, a taste database built on real cultural and behavioral data, and only plans with what comes back.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl bg-brand p-8 text-brand-fg sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold">Ready to plan your own?</h3>
            <p className="mt-1 opacity-90">It takes two minutes to enter a group.</p>
          </div>
          <LinkButton href="/plan" variant="secondary" size="lg" className="!border-transparent !bg-white !text-[#1d1a24]">Plan your own event</LinkButton>
        </div>
      </section>
    </>
  );
}
