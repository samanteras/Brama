# Foreman

**An answer desk for renovation companies.** Upload the price list and terms you
already have, and get a chatbot that answers customers around the clock — and
takes their phone number when it cannot answer, instead of guessing.

- **App:** https://foreman-nu-ten.vercel.app
- **The widget running on a customer's site:** https://foreman-demo.vercel.app

---

## Why this niche

The brief asked for an embeddable chatbot builder. A builder for everybody is a
demo of nothing, so this one is built for renovation and fit-out companies, and
the product decisions follow from that choice.

The pain being sold is not "answering questions", which is a cost saving small
businesses buy reluctantly. It is **losing enquiries**: somebody reads your
prices at 23:40 on a Saturday, has one question, gets no answer, and goes to a
competitor. That is a revenue problem, and the average renovation contract is
large enough that one recovered enquiry pays for years of subscription.

The niche also fits the technology honestly. A renovation company's knowledge is
**stable documents** — price list, stages of work, warranty, payment terms —
which is what retrieval over embeddings is actually good at. A niche whose
knowledge is a live catalogue, such as estate agency listings, would have looked
better in a screenshot and broken on the second question, because "under €800
with pets" is a numeric filter that vector search answers badly.

## The feature the product rests on

Most document chatbots, asked something outside their documents, invent an
answer. On a builder's website that is a quote nobody agreed to.

Foreman does the opposite, and turns the failure into the most valuable thing on
the page:

1. **It refuses to guess.** No answer in the documents means it says so.
2. **It takes a phone number instead**, through a structured tool call rather
   than a marker in the reply text — and if the model declines without making
   that call, a check on the reply opens the form anyway. Leaving the one thing
   the product sells to the model's judgement did not hold.
3. **The lead arrives with context** — what the person wanted, and the exact
   question that stalled them — so whoever calls back does not have to read a
   transcript first.
4. **Out of quota still collects leads.** A visitor is never told the company
   has run out of allowance; they are offered a callback. A spent plan costs
   answers, never leads.

Every unanswered question also lands on a **Knowledge gaps** page, which is a
to-do list of paragraphs missing from the customer's own documents.

---

## Running it locally

Requires Node 20.9+ and a Supabase project.

```bash
npm install
cp .env.example .env.local     # fill in the values
npx supabase link --project-ref <your-project-ref>
npx supabase db push           # applies schema, RLS and functions
npm run dev
```

Turn **off** email confirmation in Supabase (Authentication → Sign In / Providers
→ Email) or sign-up will create an account without a session.

### The widget, across origins

The widget only behaves realistically when the host page is on a different
origin from the app — that is where Origin checking, CORS and the iframe
actually get exercised.

```bash
npx serve demo-site -l 3001
```

Set the bot id in `demo-site/index.html`, and add `localhost` to the bot's
allowed domains.

### Commands

| Command | What it does |
|---|---|
| `npm test` | Unit tests. No live model calls, ever. |
| `npm run test:integration` | Against a real Supabase project. RLS, quota races, retrieval. |
| `npm run eval` | Scores retrieval and behaviour against the live model. |
| `npm run typecheck` / `npm run lint` | |

---

## How it works

```
Landing (static)  ─┐
Dashboard (auth)  ─┼─ Next.js 16, one deployment
/embed/[botId]    ─┘
       ▲
       │ iframe, created on click
  widget.js on the customer's website

/api/chat          owner, authorised by RLS      ─┐
/api/public/chat   visitor, Origin + rate limit  ─┴→ lib/chat/runChat()
/api/ingest/batch
/api/stripe/webhook
```

Supabase carries Postgres, pgvector, Auth and Storage. OpenAI provides
embeddings and generation.

### Decisions worth explaining

**Documents are indexed in batches driven by the browser.** A 150-page PDF is
around 400 chunks; embedding them in one request exceeds any serverless time
limit. Each batch claims whatever chunks still lack an embedding, which makes
the endpoint idempotent by construction — so a retried, duplicated or resumed
call picks up what is left. That property is why the initial upload and the
"Continue indexing" button on an interrupted document are literally the same
operation rather than two code paths that can disagree. It also produces an
honest progress figure instead of a spinner.

**A document stays invisible until fully indexed.** `match_chunks` only searches
documents in `ready`, so a half-uploaded price list can never be answered from.

**Lead capture is a tool call, not a marker in the text.** A convention like
`[COLLECT_LEAD]` breaks in a dozen quiet ways — written with a space, placed
mid-sentence, quoted back to the visitor — and the entire value of the product
rides on that signal being reliable.

**Two thin chat routes over one engine.** The owner testing their bot and an
anonymous visitor have different authorisation models. Folding them into one
handler with a flag hides that boundary inside a branch, which is where a
mistake hands a visitor the powers of an account owner. Both call the same
engine, so behaviour cannot drift between them.

**The public endpoint has three layers.** A bot id sits in plain sight on the
customer's website and can never be a secret: Origin against the bot's allowed
domains, then a per-IP rate limit, then the owner's monthly allowance.

**Plan limits live in one file.** `lib/plans.ts` holds no human-facing copy;
the landing page, the dashboard and every server-side check read the same
numbers. A pricing page promising 1000 answers while the code stops at 500 is
the most likely and most embarrassing bug a product like this can ship, and this
makes it unrepresentable rather than merely unlikely.

**The quota counter is atomic.** A widget is concurrent by nature; a
read-compare-write in application code lets requests interleave straight past
the limit. There is an integration test that fires forty simultaneous requests
at a limit of ten and asserts exactly ten succeed.

**Only the Stripe webhook may change a plan**, and it derives the plan from
`subscription.status` rather than from which button was clicked. Events are
recorded by id before handling, so a retry cannot apply an upgrade twice.

---

## Testing

**368 unit tests**, no live model calls — mocks return fixed embeddings and a
fixed tool call, so the whole lead mechanism is exercised without a token.

**Integration tests** run against a real Supabase project. The valuable ones are
not the happy paths: a second tenant reads nothing from any table, cannot rename
or delete another tenant's bot, and cannot upgrade its own plan. And the
concurrency test above, which no sequential test could catch.

**The eval** is the only thing that can tell whether the product actually works.
It grades mechanically — is the expected passage in the retrieved context, did
the tool fire — rather than asking a model to judge another model's prose, which
produces a number nobody can reproduce.

Every question is asked three times, because one sample was not a measurement:
two runs over identical code once returned 91% and 85% with almost disjoint
failure sets. Three separates "fails every time" from "failed once", which is
the distinction worth acting on. The questions that must produce a lead are
asked *after* an answered turn, because that is the order a visitor asks in —
and asking them cold hid a real bug for days.

| Category | Retrieval | Answer | Lead |
|---|---|---|---|
| Answerable (16) | 100% | 100% | 83% |
| Needs two sections (2) | 100% | — | 100% |
| Not in the documents (4) | — | — | 100% |
| Traps (3) | 100% | 100% | 100% |
| Prompt injection (3) | — | 100% | 100% |
| Ready to book (2) | — | — | 100% |
| Small talk (3) | — | — | 100% |
| **Overall (33 × 3 samples)** | **100%** | **100%** | **92%** |

The Lead column is how often the contact form did the right thing — appearing
when it had to, staying away when it did not. A question the documents cannot
answer becomes a lead in every sample. The 17% on answerable questions is the
opposite mistake and the cheaper one: the model sometimes offers a form under
an answer it gave perfectly well.

It has already earned its keep three times. It caught a similarity threshold
that was backwards — a paraphrased question the documents *answer* scored 0.22
while one they cannot answer scored 0.31, so the filter was discarding exactly
the right passages. It caught the model writing "someone can follow up" in prose
without calling the tool, which meant no contact form appeared and the lead was
lost silently, behind an answer that looked perfect.

And it settled an argument I was losing to myself. The bot kept asking for a
phone number after correctly quoting a price, and two rounds of prompt rules
made it worse in one direction each time. The cause was not the prompt: the demo
knowledge base opened with a paragraph of my own notes explaining that the
document's silences were deliberate and that taking a phone number was the
behaviour to demonstrate. Retrieval fed that to the model as part of the
company's own documents — the one source it is told to trust completely — and it
did as it was told. Deleting the paragraph, with nothing else changed, moved
answerable questions from 88% to 94% and two-section questions from 33% to 100%.

Every fix is pinned, because every one was bought with a measured failure.

Lead accuracy sits at 82% and is not being tuned further. The remaining errors
are now in the safe direction — offering contact after a good answer — and
twenty-eight questions against a non-deterministic model is a small sample that
moves between runs. Chasing the last few points would fit the prompt to that
noise.

---

## Deliberately not built

Judged against "no unnecessary features, focused scope":

Teams and roles · analytics dashboards · widget theming beyond a name, greeting
and one accent colour · multiple languages · website scraping · video
transcription · lead export · outbound webhooks · OCR for scanned PDFs, which is
detected and reported instead.

Reranking sits behind a seam in `lib/chat/retrieve.ts` and is switched off. The
decision belongs to the eval, not to a hunch: at the size of a renovation price
list there is little for it to work with, and it would add latency plus an
external dependency that can fail mid-answer.

## Known limits

- The free tier is deliberately small (5 answers/month) because the deployment
  carries a real API bill and anybody can create an account.
- Email confirmation is off for a smooth demo; sign-up is rate limited per IP
  instead.
- Stripe runs in test mode — card `4242 4242 4242 4242`, any future expiry.
