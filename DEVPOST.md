## Gatherly: an agent with taste

**Plan the night everyone will actually enjoy.** Gatherly uses Qloo's taste graph to find where a group's tastes overlap, then an AI agent plans the venue, playlist, activity and film, with a reason behind every pick.

**Try it:** https://gatherly-omega-eight.vercel.app (no sign-up needed) · **Code (MIT):** https://github.com/codergirl73/gatherly

---

## Inspiration

Every group plan ends the same way: someone picks a place, someone else quietly hates it. The vegetarian gets the steakhouse, the person who loves quiet music gets the loud bar, and the playlist belongs to whoever held the aux cord.

Asking an LLM does not fix that. It returns confident, generic suggestions with nothing behind them: the most famous venues and artists it has seen, and sometimes places that do not exist. Agents are culturally blind. They can reason, plan and execute, but ask what a group of real people will love and they guess.

We wanted an agent that treats **taste as data**, so that five different people each get a voice and every suggestion can show its work. Qloo's taste graph is what makes that possible: it knows how artists, films, restaurants, places and brands relate to one another across hundreds of millions of entities, and it can filter by place. That is exactly what a group planner needs and what a language model alone cannot provide.

![Gatherly's landing page: five different tastes gathering around one plan](https://raw.githubusercontent.com/codergirl73/gatherly/master/docs/images/landing.jpg)

*Gatherly's landing page: five different tastes, gathering around one plan.*

## What it does

You describe the night (a team social, birthday, offsite or friends' night out), the city, the spend level, and anything that must be respected, like "vegetarian" or "step-free access". Then you add 3–6 people and tell Gatherly what each one loves. A search-as-you-type box over Qloo finds films, shows, artists, restaurants, places, brands and books, with posters and tags.

Gatherly's agent then:

1. **Maps everyone's favorites** to Qloo entities.
2. **Measures where the group's tastes overlap and differ**: a group overlap score, themes everyone shares, each person's unique themes, and a "who clicks with whom" grid.
3. **Plans the night**: a venue and cuisine in your city, a theme, a playlist, an activity and a film.
4. **Explains every pick**: which members it fits, and the shared taste themes or favorites that connect it to each person, taken from Qloo's data.
5. **Flags tradeoffs** when tastes conflict, with a balanced alternative.
6. **Shows Qloo on vs. off**: the same group planned by an LLM alone, side by side, with how many picks can be traced to real data.

Gatherly never books or pays for anything. Hours, prices and availability are labeled "check before booking". Dietary, accessibility and budget needs come only from what the organizer types; they are never guessed from taste.

It is a complete product: sign up with a password or an emailed link, save plans to your account and reopen them on any device, or just plan as a guest. It works in light and dark mode and down to phone screens.

## Why this only works because of Qloo

Take Qloo away and Gatherly cannot do its job.

- **Real venues in the right city, ranked by group fit.** Qloo returns places in the chosen city and tells us which of the five people each one fits. An LLM can name famous restaurants; it cannot tell you that this one fits four of your five friends.
- **Discovery, not repetition.** The LLM-only plan tends to recycle the artists people just typed. Qloo returns artists nobody named but several people would like.
- **Cross-domain taste.** A person's films, shows, artists and restaurants all become signals for places and activities they have never heard of.
- **Evidence you can check.** Each pick shows the shared taste themes or favorites behind it. The Qloo on/off view makes the gap obvious: in one live run, 7 of 7 picks traced to real Qloo data versus 0 of 8 for the LLM-only plan, and the LLM plan added claims nobody can verify (like "step-free") that Gatherly will not make.

## How we built it

![Gatherly architecture](https://raw.githubusercontent.com/codergirl73/gatherly/master/docs/diagrams/architecture.png)

**Qloo is the only source of recommendations.** Four Qloo endpoints do real work:

| Step | Qloo endpoint | What it gives us |
|---|---|---|
| Typeahead and favorites | `/search` | Entity IDs, images and taste tags |
| Cuisines | `/v2/tags` | Cuisine tags for restaurant filtering |
| Overlap | `/v2/analysis/compare` | Each person's taste vs. the rest of the group |
| Venue, activity, playlist, film | `/v2/insights` with `filter.location.query`, `filter.tags`, `filter.price_level.max`, `filter.exclude.tags` | Places in the city, artists and films connected to the group's taste |

**Ranked by group fit.** For each part of the night we ask Qloo once for the whole group and once for each person. A candidate "fits" a person if it appears in that person's results, and candidates are ranked by city match, then members fitted, then affinity. That is how a pick can honestly say "fits 4 of 5".

**An agent, not a prompt.** Gemini runs a tool-use loop with four tools: `resolve_entities`, `compare_tastes`, `get_insights` and `build_plan`. It decides the order, runs independent tools in parallel, and writes the explanations, theme and tradeoffs. Progress streams to the browser live, so users watch each step ("Matching Priya's favorites…", "Finding restaurants in Lisbon…").

**Grounding enforced in code.** The model can be creative; it cannot be wrong about what exists. A validator checks that every pick's entity ID was returned by Qloo for that part of the night, overwrites names and addresses with Qloo's data, and limits each pick's "fits" to real group members. A plan that fails goes back to the model with the errors.

![Gatherly swimlane](https://raw.githubusercontent.com/codergirl73/gatherly/master/docs/diagrams/swimlane.png)

**Built to survive judging.** The Qloo client queues requests (max 4 per second), retries with backoff, caches, and de-duplicates identical calls. Gemini calls retry and fall back to a second model. Public routes are rate limited, errors are friendly, and the Qloo and Gemini keys never reach the browser.

**Stack.** Next.js, TypeScript and Tailwind on Vercel; Gemini for the agent; Supabase (Auth and Postgres with row-level security) for accounts and saved events; a Three.js scene on the landing and sign-in pages. 33 unit tests cover the Qloo client, the overlap math, grounding, match evidence and Gemini retries. A live suite of 7 tests runs against the real Qloo API and proves that the city and tag filters actually change results.

## Challenges we ran into

- **Qloo silently ignores unsupported parameters.** A filter can look applied and do nothing, so we wrote live tests that prove the city and tag filters work.
- **Generic tags drown out real taste.** Raw overlap was dominated by labels like "Restaurant" and price levels, so we filter those out to surface themes that describe taste.
- **Keeping an LLM honest.** Left alone it adds plausible detail ("it has a full bar"). We constrained it to tool data and enforce grounding in code.
- **Evidence that means something.** Early explanations were generic. Each pick now cites the favorites and shared taste themes that connect it to each person.
- **A busy model.** Our first live run failed when Gemini returned "high demand", so we added retries, a fallback model and tests for both.
- **About fifty rate-limited lookups per plan** inside roughly a minute, while still ranking every pick by group fit.

## Accomplishments we're proud of

- Every recommendation is traceable to real Qloo data, and the UI shows the evidence.
- The Qloo on/off comparison makes the value of the taste graph clear in seconds.
- It is a real product, not a script: accounts, saved events, responsive design, error handling, and a deployed, tested app.

## What we learned

Taste data changes what an agent can do: instead of guessing, it can discover and explain. Grounding is best enforced in code rather than in the prompt. And live tests against the real API save hours of debugging silent no-ops.

## Who it's for, and what's next

Gatherly is for the person who always ends up organizing: team leads and people-ops planning socials and offsites, remote teams meeting in person for the first time, and friends planning birthdays. Next we want to add:

- **Invite links**, so each member adds their own favorites.
- **Availability checks and a booking hand-off**, still user-initiated.
- **Qloo audience and demographic signals** for larger groups.
- **Multi-stop itineraries** (dinner, then an activity) with travel time between stops.

## Try it

1. Open **https://gatherly-omega-eight.vercel.app** and click **Try an example group**, or **Plan your own event** and search for anything you love.
2. Wait about 45 seconds while the agent works, then explore **Where your tastes meet**, open **Why Qloo matched this** on any pick, and click **Qloo on / off**.
3. Optional: create an account to save plans.

No login, payment or installation is needed. All example people are made up, Gatherly never books or pays for anything, and the code is MIT licensed: https://github.com/codergirl73/gatherly

**Built with:** Qloo API, Gemini, Next.js, React, TypeScript, Tailwind CSS, Three.js, Supabase, Vercel, zod, Vitest.
