# Gatherly architecture

Qloo supplies every recommendation. Gemini orchestrates and explains. Code, not a prompt, guarantees that every pick is real.

## System overview

![Gatherly architecture](diagrams/architecture.png)

Source: [diagrams/architecture.svg](diagrams/architecture.svg)

| Layer | What lives there |
|---|---|
| Browser | Landing with a Three.js scene, the three-step crew builder with live Qloo search, the streamed progress view, results (taste overlap, plan cards, Qloo on/off), sign up and sign in, My events. Guest events live in `localStorage`; signed-in users sync to Supabase. No Qloo or Gemini key ever reaches the browser. |
| Gatherly server | Next.js route handlers on Vercel: `GET /api/suggest` (typeahead), `POST /api/plan` (agent, streams NDJSON), `POST /api/baseline` (Qloo off). The agent loop, the grounding validator and the Qloo client run here. |
| Services | Qloo Taste AI (`/search`, `/v2/analysis/compare`, `/v2/insights`, `/v2/tags`), Gemini, and Supabase (Auth and a Postgres `events` table protected by row-level security). |

## Swimlane: from favorites to a grounded plan

![Gatherly swimlane](diagrams/swimlane.png)

Source: [diagrams/swimlane.svg](diagrams/swimlane.svg)

1. The organizer fills in the night and adds each person's favorites; the UI calls `/api/suggest`, which queries Qloo `/search` and returns matches with images and taste tags.
2. **Plan our night** posts the group to `/api/plan`, which streams events back as NDJSON.
3. The agent loop sends Gemini the group brief, the rules and four tool definitions.
4. Gemini calls `resolve_entities` (favorites picked from search are already resolved), then `compare_tastes` (Qloo `/v2/analysis/compare`, each person against the rest of the group), then `get_insights` for venue, playlist, activity and film in parallel (Qloo `/v2/insights`, once for the group and once per person).
5. Each candidate is ranked by city match, members fitted, then affinity, and carries evidence: the favorites or shared taste themes that connect it to each person.
6. Gemini calls `build_plan`. The grounding validator accepts the plan only if every entity ID was returned by Qloo for the right part of the event; otherwise the errors go back to Gemini to fix.
7. The plan streams to the browser. In parallel, `/api/baseline` asks Gemini for the same plan with no tools and no grounding, for the Qloo on/off comparison.
8. Signed-in users' events are upserted to Supabase.

## Key design decisions

- **Grounding in code.** The validator overwrites names and addresses from Qloo data and rejects unknown IDs, so a hallucinated venue cannot reach the UI.
- **Group fit is measured, not guessed.** One Qloo query for the group plus one per person tells us who each candidate fits.
- **Resilient by default.** Qloo client: 4 requests per second, retries with backoff, cache and in-flight de-duplication. Gemini: retries and a fallback model.
- **Constraints are explicit.** Dietary, accessibility and budget needs come only from user input; budget maps to Qloo's price-level filter.
- **No booking.** Gatherly suggests; hours, prices and availability are labeled "check before booking".

## Code map

| Path | Purpose |
|---|---|
| `src/lib/qloo/` | Qloo client (queue, retries, cache) and types |
| `src/lib/agent/` | Agent loop, tools, grounding validator, prompts, Gemini client |
| `src/lib/overlap.ts` | Shared vs. individual taste themes and pairwise similarity |
| `src/lib/schemas.ts` | zod schemas for the group input and the plan |
| `src/app/api/` | `suggest`, `plan`, `baseline` route handlers |
| `src/components/` | Builder, progress, overlap visualization, plan cards, comparison, 3D scenes |
| `supabase/schema.sql` | Events table and row-level security policies |
| `tests/` | Unit tests; `tests/integration/` has live Qloo tests |
