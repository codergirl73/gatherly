# Gatherly: Devpost submission

Copy each section into the matching Devpost field. The image gallery order and captions are at the end, and the image files are in `/Users/sandy/Hackathon/gatherly-devpost-assets/`.

---

## Project name
Gatherly

## Tagline (one line)
An agent with taste: plan the night everyone will actually enjoy, grounded in Qloo's taste graph.

## Links
- Live app: https://gatherly-omega-eight.vercel.app
- Code (MIT): https://github.com/codergirl73/gatherly
- Architecture and diagrams: https://github.com/codergirl73/gatherly/blob/master/docs/ARCHITECTURE.md

---

## Inspiration
Every group plan ends the same way: someone picks a place, someone else quietly hates it. The vegetarian gets the steakhouse, the person who loves quiet music gets the loud bar, and the playlist belongs to whoever held the aux cord.

Asking an LLM does not fix that. It returns confident, generic suggestions with no data behind them, usually the most famous venues and artists it has seen, and sometimes places that do not exist. We wanted an agent that treats **taste as data**, so that a group of five different people each gets a voice, and every suggestion can show its work.

Agents are culturally blind: they can reason, plan and execute, but ask what a group of real people will love and they guess. Qloo's taste graph, with hundreds of millions of entities across music, film, dining and places, is the missing piece. It knows how artists, films, restaurants, places and brands relate to one another, and it can filter by place. That is exactly what a group planner needs and what a language model alone cannot provide.

## What it does
You describe the night: event type (team social, birthday, offsite, friends night out), city, budget, and any explicit constraints (vegetarian, step-free access, no alcohol). Then you add 3–6 people and tell Gatherly what each person loves. A search-as-you-type box over Qloo finds films, shows, artists, restaurants, places, brands and books, with posters and tags, so nothing is mis-typed.

Gatherly then runs an agent that:
1. **Maps everyone's favorites** to Qloo entities.
2. **Measures where the group's tastes overlap and differ**: a group overlap score, themes shared by everyone, each person's unique themes, and a pairwise "who clicks with whom" grid.
3. **Plans the event**: a venue and cuisine in the chosen city, a theme, a playlist, an activity, and a film.
4. **Explains every pick**: which members it fits, and the shared taste themes (or favorites) that connect it to each person, taken from real Qloo data.
5. **Flags tradeoffs**: when tastes conflict, it says so and offers a balanced alternative.
6. **Shows Qloo on vs. off**: the same group planned by an LLM alone, side by side, with how many picks can be traced to real data.

Gatherly never books or pays for anything. Hours, prices and availability are labeled "check before booking". Dietary, accessibility and budget needs come only from what the organizer types; they are never inferred from taste.

Accounts are real (Supabase): sign up with a name and avatar color, sign in with a password or a one-time email link, and your plans are saved to your account and reopen on any device. Guests can plan too; their events stay on the device.

## Why this only works because of Qloo
If you removed Qloo, Gatherly could not do its job. Each of these needs the taste graph:
- **Real venues in the right city, ranked by group fit.** Qloo returns places in the chosen city and tells us which of the five people each one fits. An LLM can name famous restaurants; it cannot tell you that this one fits four of your five friends.
- **Discovery, not repetition.** The LLM-only plan tends to recycle the group's own favorites (in our runs it kept suggesting the artists people had just typed). Qloo returns artists nobody named but several people would like, such as an experimental hip-hop artist for an indie fan and a film-score fan.
- **Cross-domain taste.** A person's films, shows, artists and restaurants all become signals for places and activities they have never heard of.
- **Evidence you can check.** Each pick cites the shared taste themes or favorites that connect it to each person, taken from Qloo's data. The Qloo on/off view makes the gap visible: in one live run, 7 of 7 picks traced to real Qloo data versus 0 of 8 for the LLM-only plan, and the LLM plan added unverifiable claims (for example step-free access) that Gatherly refuses to make.

## How we built it

### Qloo is the only source of recommendations
| Step | Qloo endpoint | What it gives us |
|---|---|---|
| Typeahead and favorites | `GET /search` (typed by category) | Entity IDs, images and taste tags for what people love |
| Cuisines | `GET /v2/tags` | Cuisine tag IDs for restaurant filtering |
| Overlap | `GET /v2/analysis/compare` | Each person's taste tags vs. the rest of the group |
| Venue and cuisine | `GET /v2/insights`, `filter.type=urn:entity:place` with `filter.location.query`, `filter.tags` (cuisine) and `filter.price_level.max` | Restaurants in the chosen city, seeded by the group's entities |
| Activity | `GET /v2/insights` for places, restaurants excluded with `filter.exclude.tags` | Things to do in that city |
| Playlist | `GET /v2/insights`, `filter.type=urn:entity:artist` | New artists connected to the group's taste |
| Film | `GET /v2/insights`, `filter.type=urn:entity:movie` | Films connected to the group's taste |

The legacy `/recs` endpoints are not used.

**Ranking by group fit.** For each part of the event we ask Qloo once for the whole group and once for each person. A candidate "fits" a person if it appears in that person's results. Candidates are ranked by city match, then by how many people they fit, then by Qloo's affinity score. That is how a pick can honestly say "fits 4 of 5".

### An agent, not a prompt
Gemini runs a tool-use loop with four tools: `resolve_entities`, `compare_tastes`, `get_insights` and `build_plan`. It decides the order, calls independent tools in parallel, and writes the explanations, the theme and the tradeoffs. Progress streams to the browser as NDJSON, so users watch each step ("Matching Priya's favorites…", "Finding restaurants in Lisbon…").

### Grounding enforced in code
The model can be creative; it cannot be wrong about what exists. After `build_plan`, a validator checks that **every pick's entity ID was returned by Qloo for that part of the event**, overwrites names and addresses with Qloo's data, and limits each pick's "fits" list to real group members. A plan that fails is sent back to the model with the errors. The result is validated with zod, so the UI always receives a well-formed plan.

### Built to survive judging
- **Qloo client**: request queue capped at 4 requests per second, per-request timeouts, exponential backoff on 429 and 5xx (honoring `Retry-After`), an in-memory cache, and de-duplication of identical in-flight requests.
- **Gemini resilience**: retries on transient errors, then falls back to a second model, and shows a friendly message if the model stays busy.
- **Rate limits** per IP on the public routes, and friendly error and empty states instead of crashes.
- **Keys stay server-side**: the browser never sees the Qloo or Gemini keys.

### Product
Next.js (App Router), TypeScript and Tailwind. A three-step crew builder with live Qloo search, a streamed progress view, a taste-overlap visualization, plan cards with expandable "Why Qloo matched this", a Qloo on/off comparison, My events, and Supabase auth with row-level security so each user only ever sees their own events. Light and dark mode, responsive down to phones, and a Three.js scene on the landing and sign-in pages (with a 2D fallback and reduced-motion support).

### Quality
33 unit tests cover the Qloo client (mocked), the overlap math, plan validation and grounding, match evidence, typeahead mapping and Gemini retries. A live integration suite (7 tests) runs against the real Qloo API and verifies that the city filter is honored for Lisbon, London and New York, that different cities return different results, and that the tag filter changes results. Qloo ignores unsupported parameters silently, so we prove they work. ESLint and type checks pass.

## Architecture and swimlane
See the two diagrams in the gallery (`12-architecture.png`, `13-swimlane.png`) and in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Architecture, in one line:** a browser app talks to three route handlers; the agent loop (Gemini function calling) uses four tools through a rate-limited Qloo client; a grounding validator checks the plan against Qloo's results; Supabase stores each signed-in user's events behind row-level security.

**Swimlane, in one line:** organizer → UI → `/api/plan` → Gemini calls tools → Qloo returns candidates → validator accepts or rejects → streamed plan → UI, with the Qloo-off baseline running in parallel and the event saved to Supabase.

## Challenges we ran into
- **Qloo silently ignores unsupported parameters.** A filter can look applied and do nothing. We wrote live tests that prove the city and tag filters change results.
- **Generic tags drown out real taste.** Raw tag overlap was dominated by labels like "Restaurant" and price levels, so we filter those out to surface themes that actually describe taste.
- **Keeping an LLM honest.** Left alone, it adds plausible detail ("it has a full bar"). We constrained the prompt to tool data and enforce grounding in code, so a made-up pick cannot reach the UI.
- **Evidence that means something.** Early "why this pick" explanations were generic. We now cite the favorites and shared taste themes that connect each pick to each person.
- **A busy model during testing.** Our first live run failed when Gemini returned "high demand". We added retries with a model fallback and tests for it.
- **Fitting dozens of rate-limited lookups into about a minute** while still ranking every pick by group fit.

## Accomplishments we're proud of
- Every recommendation is traceable to real Qloo data, and the UI shows the evidence.
- The Qloo on/off comparison makes Taste AI's value obvious in seconds: the LLM-only plan has no data behind its picks, while the Qloo plan's picks all do.
- It is a real product, not a script: accounts, saved events, responsive design, error handling, and a deployed, tested app.

## What we learned
Taste data changes what an agent can do: instead of guessing, it can discover (artists nobody named but several people would like) and explain. Grounding is best enforced in code rather than in the prompt. And verifying API behavior with live tests saves hours of debugging silent no-ops.

## What's next
- Invite links, so each member adds their own favorites.
- Calendar and availability checks, and a booking hand-off (still user-initiated).
- Qloo audience and demographic signals for larger groups.
- Multi-stop itineraries (dinner, then an activity) with travel time between stops.

## How Gatherly maps to the judging criteria

**Technological implementation: how thoroughly and skillfully is Qloo used?**
Four Qloo endpoints do real work: `/search` (typeahead and entity resolution), `/v2/tags` (cuisines), `/v2/analysis/compare` (per-person taste overlap) and `/v2/insights` with location, tag, price-level and exclusion filters. Each part of the plan is queried once for the group and once per person (about 50 Qloo requests per plan) so every pick is ranked by how many members it truly fits. It is a non-trivial system: a tool-using agent, a validator that rejects any pick Qloo did not return, a rate-limited, cached, retrying Qloo client, streamed progress, and live tests proving Qloo's filters are honored.

**Design: a complete, coherent product, not a proof of concept?**
Landing page, accounts (password and email link), a three-step builder with live search, a streamed progress view, a taste-overlap visualization, evidence-backed plan cards, My events, error and empty states, light and dark mode, and a layout that works on phones.

**Potential impact: a credible case for a real problem and a real audience?**
Group planning is a real, recurring chore for team leads and people-ops running socials and offsites, for remote teams meeting in person, for friends organizing birthdays, and for anyone organizing a night out that has to work for more than one taste. Today it is solved by guesswork or a group chat that ends with the loudest voice winning. Gatherly gives every member a voice, flags tradeoffs honestly, respects explicit constraints (dietary, access, budget) and never books or pays for anything on its own.

**Quality of the idea: a creative, non-obvious use of Qloo?**
Qloo is used for *group* taste, not individual recommendation: it compares people against each other to find shared and unique taste, and it transfers taste across domains. Someone's favorite films, artists and restaurants all become signals that point to a city venue they have never heard of. The Qloo on/off view makes the difference visible, and the grounding rule means the agent can only recommend what Qloo actually returned.

## Built during the submission period
Gatherly was created from scratch between the start of the submission period and the deadline. It reuses only open-source libraries (Next.js, React, Tailwind, Three.js, zod, Vitest, Supabase client) and the Qloo and Gemini APIs, used within their terms.

## Testing instructions
No login, payment or installation is needed, and the app is free to use.
1. Open https://gatherly-omega-eight.vercel.app.
2. Click **Try an example group**, or **Plan your own event** and search for anything you love.
3. Wait about 45 seconds for the plan. Explore the taste-overlap section, open **Why Qloo matched this**, and use **Qloo on / off** to compare with an LLM-only plan.
4. Optional: create an account to save plans and reopen them on another device. Email confirmation is off, so sign-up logs you straight in.

Notes: the app will stay online and free through the judging period. If the planning model is briefly busy, the app retries automatically and then shows a friendly message; trying again a minute later works.

## Built with
Qloo Taste AI API, Gemini, Next.js, React, TypeScript, Tailwind CSS, Three.js, Supabase (Auth and Postgres), zod, Vitest, Vercel, GitHub.

## Judge's guide (60 seconds)
1. Open https://gatherly-omega-eight.vercel.app and click **Try an example group**.
2. Watch the agent's steps stream in (about 45 seconds).
3. Read **Where your tastes meet**: overlap score, shared and unique themes, who clicks with whom.
4. Open **Why Qloo matched this** on any pick to see the shared taste themes behind it.
5. Click **Qloo on / off** to see the same group planned by an LLM alone.
6. Optional: **Plan your own event**, and search for anything you love. Sign up to save plans.

## Data and safety
All example people are made up; no real person's data is used. Gatherly never books or pays for anything. Qloo response data is cached privately in server memory only and is not stored in the repository. All text is in English. Licensed MIT.

---

## Image gallery (upload in this order)
Folder: `/Users/sandy/Hackathon/gatherly-devpost-assets/`

| # | File | Caption |
|---|---|---|
| 1 | `01-landing.jpg` | Landing page: five tastes gathering around one plan |
| 2 | `02-builder-night.jpg` | Step 1: describe the night (event, city, spend, explicit constraints) |
| 3 | `03-builder-search.jpg` | Step 2: add the crew with search-as-you-type over Qloo |
| 4 | `04-progress.jpg` | The agent at work: every step streams live |
| 5 | `05-results-overview.jpg` | The plan at a glance: eat, do, listen, watch |
| 6 | `06-taste-overlap.jpg` | Where the group's tastes meet: shared themes, unique themes, who clicks with whom |
| 7 | `07-plan-cards-evidence.jpg` | Every pick explains whose taste it fits, with real evidence from Qloo |
| 8 | `08-qloo-on-off.jpg` | Qloo on vs. off: the same group, planned two ways |
| 9 | `09-signup.jpg` | Sign up: pick a color and watch yourself join the group |
| 10 | `10-my-events.jpg` | My events: saved plans |
| 11 | `11-mobile.jpg` | Responsive: landing, plan and builder on a phone |
| 12 | `12-architecture.png` | Architecture |
| 13 | `13-swimlane.png` | Swimlane: from favorites to a grounded plan |

Use image 1 as the thumbnail.

## Optional walkthrough video script (about 90 seconds; a video is not required by the rules)
1. **0:00** On the landing page: "Planning for a group means someone always loses. Gatherly plans the night everyone will actually enjoy, powered by Qloo's Taste AI."
2. **0:10** Click **Plan your own event**. Choose a type, a city and a spend level; tick a dietary need.
3. **0:25** On the crew step, search "radiohead" and add it; add two more. "Search runs on Qloo, so every favorite is a real entity."
4. **0:40** Hit **Plan our night**. "The agent resolves favorites, compares tastes, then asks Qloo for venues, artists and films, and checks every pick."
5. **0:55** Results: the overlap view ("here is what the group shares and where it differs"), then open **Why Qloo matched this**.
6. **1:10** Click **Qloo on / off**: "The same group planned by an LLM alone: nothing traceable to real data. With Qloo, every pick is."
7. **1:25** Close: "Gatherly: plan the night everyone will actually enjoy." Show the URL.
