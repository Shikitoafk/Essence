# Essence

**Get sharper questions, not rewritten sentences. Every word stays yours.**

Essence is a Socratic feedback tool for college application essays. It reads a
draft once, properly — a full structural diagnostic against a 20-point error
checklist and an admissions-consulting framework — then works through what it
found **one question at a time**, in chat.

It never writes a sentence for the student. That isn't just a prompt
instruction; the interface has no "insert", no "suggested text", and no way to
paste the AI's words into the draft. Answers the student types back are raw
material for *them* to write with.

---

## What it does

1. **Deep diagnostic (one AI call per draft).** Narrative vs. Montage, where the
   central problem sits, which of the 20 checklist errors actually appear, how
   the essay fares against the Matryoshka / Balloon+Needle / Eureka Problem /
   Environment-vs-Person lenses, top 3 priorities, and an honest account of what
   already works — explained three ways (to a 10-year-old, to a 17-year-old
   applicant, to a Writing PhD).
2. **Flagged spot cards.** Each one anchors to an exact line in the draft and
   states what's clear, what's still unexplored, and why it matters *here*.
   The quoted line is highlighted in the editor; clicking either side links them.
3. **The Socratic loop.** One question at a time, hardest-hitting first. A vague
   answer gets a *narrower* version of the same question, not a pass. "I don't
   have anything concrete here" is accepted without pressure. A request to
   rewrite is refused plainly.
4. **Season memory.** Facts the student shares (people, places, ongoing
   projects) persist, so later questions build on them instead of re-asking.
   Anything flagged private is never stored.
5. **A stopping point.** Every read ends with a verdict on where the draft
   stands — `structural`, `developmental`, `polish` or `done`. This exists
   because a tool built to find weaknesses will find them forever: without an
   endpoint students loop between fixes and eventually sand away what made the
   essay theirs. The engine is told which round it's on, instructed not to
   invent a new tier of objections to justify a later read, and to flag fewer
   spots or none once a draft is at rest. At `polish` and `done` the interface
   stops inviting another round — the button reads "Read again anyway".
6. **Head-to-head comparison.** For students who end up with two genuinely
   different versions — one built on a metaphor, one stripped of it — and can't
   choose. It scores both on five fixed axes (core self, texture, voice,
   structural soundness, risk), weights core self / voice / risk above the rest,
   and **always picks one**: "both are strong in different ways" is the failure
   state, not a valid answer. At most three borrowings from the loser, each an
   exact quote from the student's own draft with a destination but never a
   phrasing. Accepting archives the losing version, because two equally visible
   versions is what keeps students oscillating. Near-identical drafts are caught
   before the call — there's nothing to choose between two copies.
7. **Revision history.** Every feedback run snapshots the draft; a word-level
   diff and a resolved / open / set-aside count per version show real movement.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (auth +
Postgres) · Gemini API · deployable to Vercel as-is.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

Create a project at [supabase.com](https://supabase.com), then:

- Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and run it.
  This creates every table, index and row-level-security policy. It's safe to re-run.
- If your database predates the readiness verdict, also run
  [`supabase/migrations/002_readiness.sql`](supabase/migrations/002_readiness.sql).
  New projects get those columns from `schema.sql` already.
- For Google sign-in: **Authentication → Providers → Google**, enable it, and add
  your OAuth client ID/secret. Set the redirect URL to
  `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`
  for local work). Email/password works with no extra setup.

### 3. Environment

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL_DIAGNOSTIC` | *(optional)* comma-separated model chain for the deep read |
| `GEMINI_MODEL_CONVERSATION` | *(optional)* comma-separated model chain for chat turns |
| `NEXT_PUBLIC_SITE_URL` | *(production only)* your deployed URL, for OAuth redirects |

### 4. Run

```bash
npm run dev
```

---

## The provider choice is a privacy decision

Gemini generates the feedback. Which billing tier the key sits on is not a
cost detail — it changes what happens to a student's essay:

| | Trains on your text? | Human review? |
| --- | --- | --- |
| **Gemini**, paid tier | No | No |
| **Gemini**, free tier | **Yes** | **Yes** |

Google's unpaid-tier terms state: *"Do not submit sensitive, confidential, or
personal information to the Unpaid Services."* An application essay is personal
information, so a deployment serving real students belongs on a billed key with
`GEMINI_PAID_TIER=true`.

Before adding any provider, get its position on training and retention **in
writing**, and encode it in `dataPolicy()` — a vendor that will not answer that
question in writing defaults to `safeForPersonalContent: false`.

Whatever is configured, the app tells students the truth: `dataPolicy()` in
[`src/lib/ai/llm.ts`](src/lib/ai/llm.ts) drives both the privacy page and a
banner in the workspace, and warns prominently whenever the active provider may
train on what they paste. Its branches are covered by tests.

## Staying inside the Gemini free tier

The two call types have very different costs, so they run on different models:

| | Model tier | Free-tier ceiling | Per-user cap in this app |
| --- | --- | --- | --- |
| **Deep read** (whole essay, once per draft) | Flash | ~5/min, ~20/day | 2/min, 8/day |
| **Chat turn** (one spot, short context) | Flash Lite | ~15/min, ~500/day | 8/min, 150/day |

Three things keep usage low:

- The full-essay scan is **one** batched call. It is never re-sent during the
  conversation — a follow-up turn ships only the spot card being worked plus the
  Q&A so far.
- Each tier is a **fallback chain**. If a model is out of quota or your key
  can't see it, the request walks to the next model instead of failing.
- Per-user limits are enforced in Postgres (`ai_usage`), not in memory, so they
  hold across serverless instances.

Drafts under 50 words never reach the API at all.

Model IDs change; the defaults live in [`src/lib/ai/gemini.ts`](src/lib/ai/gemini.ts)
and are overridable by env var without touching code.

---

## How the AI is wired

[`src/lib/ai/systemPrompt.ts`](src/lib/ai/systemPrompt.ts) holds the engine's
system instruction **verbatim** — the principles, framework, 20-point checklist,
5 nudge patterns, Mode A format, Mode B conversational rules, cross-essay
memory, and the "what to never do" list. Those rules are the product. Don't edit
them to change app behaviour — add to `ENGINE_REFINEMENTS` instead, so the
original spec stays diffable against its source file.

`ENGINE_REFINEMENTS` currently adds two things, both from reviewing real output:

- **Claimed-interest coherence.** Catches an essay that offers an experience as
  evidence for a declared field when the two are genuinely different disciplines
  (e.g. nanoparticle chemistry presented as preparation for gene editing). It
  fires only when the essay makes a literal claim, never on a metaphor the essay
  presents as one — a false positive here costs the student a good line, so the
  guard rails matter and are covered by tests.
- **Section 6 must analyse, not summarise.** Each strength has to explain the
  effect a passage produces, not restate what the essay contains.

Appended at call time are two further *formatting-only* contracts:

- **Mode A** returns markdown wrapped in `<<<SECTION:n>>>` / `<<<CARD>>>`
  markers, parsed by [`parseReport.ts`](src/lib/ai/parseReport.ts) into the
  `flagged_spots` and `essay_reports` tables.
- **Mode B** returns a small JSON object — the chat reply plus a
  `resolved` / `needs_narrower` / `skipped` verdict that drives the queue, and
  any durable facts worth remembering.

Every quoted line is re-anchored against the real draft before it is stored
(tolerating smart quotes, dashes and collapsed whitespace). A card whose quote
can't be found in the draft is dropped rather than shown — that's the guard
against an invented quotation.

```bash
npm test        # parser + quote-anchoring tests
npm run build   # production build
```

---

## Deploying to Vercel

Import the repo, add the same environment variables in **Settings → Environment
Variables**, and deploy. Set `NEXT_PUBLIC_SITE_URL` to the production URL so
OAuth redirects land correctly, and add that callback URL to both Supabase and
your Google OAuth client.

## Data & privacy

Essays live in your own Supabase project. Row-level security scopes every table
to the signed-in owner. The only outbound path for essay text is the Gemini API
call that generates feedback.

Vercel Analytics is enabled for page-view counts. It receives the URL path and
nothing else — no essay text, no conversation answers, no user identity — sets
no cookies and does no cross-site tracking. There is no advertising or ad
tracking. To remove it, drop `<Analytics />` from
[`src/app/layout.tsx`](src/app/layout.tsx) and uninstall `@vercel/analytics` —
and update the privacy page, which describes it to students by name.

The in-app **Privacy & data** page states all of this and lets students read and
delete every remembered fact.

## Deliberately not built

No essay generation, autocomplete, or "write this paragraph for me" — that is
against the product's core philosophy, not a missing feature. No
plagiarism/AI-detection scoring. No payments; the app is fully functional and
free.
