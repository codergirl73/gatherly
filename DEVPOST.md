# Gatherly: Devpost submission draft

**Tagline:** An AI agent that plans the group event everyone will actually enjoy, grounded in Qloo's Taste AI.

## Inspiration
Every group plan ends the same way: someone picks a place, someone else quietly hates it. Asking an LLM for ideas gives confident, generic answers, and sometimes venues that don't exist. We wanted an agent that treats *taste* as data, so the vegetarian, the indie fan and the person who wants somewhere quiet all get a say, and every suggestion can show its work.

## What it does
You enter a group of 3–6 people, a city, a budget and any explicit constraints. Each person shares a few favorites across films, TV, artists, restaurants, places, brands and books. Gatherly then:
- resolves every favorite to a Qloo entity and measures where the group's tastes overlap and differ (group overlap score, shared themes, each person's unique themes, pairwise similarity);
- plans the event: venue and cuisine, a theme, a playlist, an activity and a film;
- explains every pick by naming which members' favorites it connects to, with the Qloo tags behind it;
- flags tradeoffs when tastes conflict and offers a balanced alternative;
- shows the same group planned with Qloo off (LLM only) side by side, so the difference is visible.

Gatherly never books or pays for anything, and labels hours, prices and availability "check before booking".

## How we built it
- **Qloo is the only source of recommendations.** `/search` resolves favorites; `/v2/analysis/compare` measures each person against the rest of the group; `/v2/insights` returns restaurants and activities in the chosen city (with cuisine tag and price-level filters), artists and films. We call insights once for the group and once per person, so each candidate is ranked by how many members it actually fits.
- **Gemini on Vertex AI** runs a tool-use agent loop (`resolve_entities`, `compare_tastes`, `get_insights`, `build_plan`). It decides the order and writes the explanations.
- **A grounding validator** checks the final plan: every pick must be an entity Qloo returned for that part of the event, and names and addresses are overwritten from Qloo data. Plans are validated with zod.
- **A resilient Qloo client:** request queue (≤4 req/s), timeouts, exponential backoff on 429/5xx, in-memory cache and in-flight de-duplication, so repeated demo runs don't burn quota.
- **Next.js + TypeScript + Tailwind**, streaming agent progress to the UI, responsive with light and dark modes. Unit tests cover the client, the overlap math and plan grounding; a live integration suite verifies city filtering against the real API.

## Challenges
- Qloo silently ignores parameters that a type doesn't support, so we wrote live tests proving the city and tag filters change results.
- Raw tag overlap is dominated by generic tags ("Restaurant", price descriptors), so we filter those out to surface meaningful shared taste.
- Keeping an LLM honest: it loves to add plausible detail ("has a full bar"). We constrained the prompt to tool data and enforce grounding in code.
- Fitting a multi-call agent plus dozens of rate-limited Qloo requests into a one-minute experience.

## Accomplishments we're proud of
- Every recommendation is traceable to real Qloo data, and the UI shows the evidence.
- The Qloo on/off comparison makes the value of Taste AI obvious in seconds.
- A polished, responsive product experience, not just a demo script.

## What we learned
Taste data changes what an agent can do: instead of guessing, it can discover (artists nobody named but everyone would like) and explain. Grounding is best enforced in code, not just in the prompt. Verifying API behavior with live tests saves hours of debugging silent no-ops.

## What's next
- Real shared invites: members enter their own favorites via a link.
- Calendar and availability checks, and booking hand-off (still user-initiated).
- Qloo audience and demographic signals for larger groups.
- Multi-stop itineraries (dinner, then activity) with travel-time awareness.

## Built with
Qloo Taste AI API, Gemini on Vertex AI, Next.js, TypeScript, Tailwind CSS, zod, Vitest, Vercel.
