import { LinkButton } from "@/components/ui";
import { PresetCard, ExampleButton } from "@/components/PresetButton";
import { PRESETS } from "@/lib/presets";
import { Gather3D } from "@/components/Gather3D";

const steps = [
  { n: "1", t: "Tell us who's coming", d: "Add 3–6 people, a city and a budget. Everyone shares a few favorites: films, artists, restaurants, places." },
  { n: "2", t: "Qloo maps your tastes", d: "We resolve every favorite to Qloo's Taste AI and measure where the group overlaps and where it differs." },
  { n: "3", t: "Get a plan with reasons", d: "Venue, theme, playlist, activity and film. Each pick explains whose favorites it connects to, with tradeoffs flagged." },
];

const faqs = [
  { q: "How does Gatherly choose?", a: "It matches everyone's favorites to Qloo's Taste AI, measures where the group overlaps, then asks Qloo for venues, artists and films ranked by how many people each one fits. An AI writes the explanation, but can only recommend what Qloo returned." },
  { q: "Does Gatherly book or pay for anything?", a: "No. It suggests; you decide and book. Hours, prices and availability aren't checked, so confirm them with the venue first." },
  { q: "How are dietary needs and budget handled?", a: "Only from what you enter. Gatherly never guesses dietary or accessibility needs from taste. Budget filters restaurant price level, and your constraints are flagged for you to confirm with the venue." },
  { q: "What happens to our data?", a: "Favorites you enter are sent to Qloo and to Google's Gemini model to build the plan. Guests' events stay on their device. If you sign in, events are saved to your account so you can reopen them anywhere." },
  { q: "Why does planning take about a minute?", a: "Gatherly makes dozens of lookups (one per person for every part of the event) so each pick is genuinely ranked by group fit." },
];

const features = [
  { t: "Grounded, never invented", d: "Every venue, artist and film comes straight from Qloo. We reject any pick the model can't trace back to real data." },
  { t: "Overlap you can see", d: "A taste map shows what the whole group shares, what pairs share and what's uniquely yours." },
  { t: "Honest about conflict", d: "When tastes clash, Gatherly says so and offers a balanced alternative so nobody is the afterthought." },
  { t: "See Qloo's difference", d: "Flip the comparison to view the same group planned by an LLM alone, side by side." },
];

export default function Home() {
  const example = PRESETS[0];
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
              <ExampleButton preset={example} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-brand-fg shadow-sm transition hover:opacity-90">
                ✨ Try an example group
              </ExampleButton>
              <LinkButton href="/plan" variant="secondary" size="lg">Plan your own event</LinkButton>
            </div>
            <p className="mt-4 text-sm text-muted">No sign-up needed. Example groups are made-up people.</p>
          </div>

          <div className="rise mx-auto w-full max-w-md lg:max-w-none" style={{ animationDelay: "120ms" }}>
            <Gather3D names={["Ana", "Liam", "Yuki", "Omar", "Greta"]} className="h-[22rem] sm:h-[26rem]" />
            <div className="mx-auto -mt-2 max-w-sm rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-brand">Everyone, one plan · Lisbon</div>
                  <div className="font-display text-lg font-semibold">Time Out Market</div>
                </div>
                <span className="rounded-full bg-good/15 px-2.5 py-1 text-xs font-semibold text-good">Fits 4 of 5</span>
              </div>
              <p className="mt-1.5 text-sm text-muted">Five different tastes, gathered around the place that fits most of them.</p>
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

      <section id="examples" className="border-y border-border bg-surface-2/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Try an example group</h2>
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
        <div className="mt-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}<span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
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
