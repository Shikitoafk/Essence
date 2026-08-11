import Link from "next/link";
import Logo, { LogoMark } from "@/components/Logo";
import Reveal from "@/components/Reveal";
import HeroAnnotation from "@/components/HeroAnnotation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/**
 * The page is laid out as the thing the product does.
 *
 * Essence's whole gesture is a reader working in the margin of someone's page —
 * a line marked, a question written beside it. So this is not a centred column
 * of cards containing a picture of that. It is set on `.sheet`: a left margin
 * for what organises a page without being part of it, a measure for the prose,
 * and a right margin where annotations land beside the line they answer.
 *
 * Prose carries `font-serif` (Newsreader). Sans is left to chrome — buttons,
 * nav, labels — so the reading and the interface never speak in one voice.
 */

/**
 * A section's marginal label — the number a reader writes beside a passage.
 *
 * Rendered without a wrapper so it can be dropped straight into a `.sheet`
 * slot: which column anything lands in is decided by source order, so an extra
 * element here would push the measure and the note one track along.
 */
function Gloss({ n, label }: { n: string; label: string }) {
  return (
    <>
      <div className="font-wordmark text-3xl leading-none text-accent">{n}</div>
      <div className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
    </>
  );
}

const STEPS: [string, string][] = [
  ["Paste your draft", "Add the prompt and word limit if you have them."],
  ["One deep read", "A full structural diagnostic, in a single pass."],
  ["One question at a time", "A vague answer gets a narrower question, not a pass."],
  ["Rewrite it yourself", "Save a version, run it again, watch the spots close."],
];

const FAQ: [string, string][] = [
  [
    "Will it write my essay for me?",
    "No, and there is no setting that changes that. Ask it directly and it refuses, then re-asks the question it was on. What you get back is your own material, in your own words, laid out so you can see it — never a sentence to paste.",
  ],
  [
    "Is it free?",
    "Yes. No card, and no trial clock running out on you. Usage is capped per person so one heavy session can't exhaust the limits for everyone else.",
  ],
  [
    "What happens to my essay?",
    "It is sent to a language model to be read, and stored in your account so you can compare versions later. Which model, and exactly what its terms permit that company to do with your text, is written in plain language on the privacy page — before you paste anything.",
  ],
  [
    "Will it just tell me my essay is good?",
    "No. It will also tell you when the essay is finished, which is rarer and more useful. Every finding is rated by how much it actually matters, and a draft with nothing serious left is reported as ready — padding it with nitpicks would only flatten your voice.",
  ],
  [
    "Does it work on supplementals?",
    "Yes, and it checks them against your other essays for repetition — two essays that reveal the same side of you are a wasted slot, and that is easy to miss when you write them weeks apart.",
  ],
];

export default async function LandingPage() {
  let signedIn = false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  const primaryHref = signedIn ? "/dashboard" : "/login";
  const primaryLabel = signedIn ? "Go to your essays" : "Start free";

  return (
    <div className="min-h-screen">
      <header className="nav-blur sticky top-0 z-50 border-b border-line/70">
        <div className="mx-auto flex max-w-[78rem] items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Essence — home">
            <Logo size="sm" />
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="#how"
              className="hidden text-muted transition-colors hover:text-ink sm:block"
            >
              How it works
            </Link>
            <Link
              href="#faq"
              className="hidden text-muted transition-colors hover:text-ink sm:block"
            >
              FAQ
            </Link>
            <Link
              href="/settings"
              className="hidden text-muted transition-colors hover:text-ink sm:block"
            >
              Privacy
            </Link>
            <Link
              href={primaryHref}
              className="rounded-full bg-ink px-4 py-2 text-paper transition hover:opacity-85"
            >
              {signedIn ? "Your essays" : "Start free"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[78rem] px-6">
        {/* Hero -------------------------------------------------------------
            Above the fold, so entrances are the CSS-only `.rise` — nothing here
            waits on a bundle to become visible. */}
        <section className="sheet pt-16 pb-14 sm:pt-24 sm:pb-20">
          <div className="gloss rise">
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
              Admissions
              <br />
              essays
            </div>
          </div>

          <div>
            <h1
              className="rise font-wordmark text-[2.75rem] leading-[1.02] tracking-tight text-ink sm:text-6xl"
              style={{ animationDelay: "0.06s" }}
            >
              The honest read
              <br />
              your essay <em className="italic">hasn&apos;t had</em>.
            </h1>

            <p
              className="rise mt-7 font-serif text-xl leading-relaxed text-muted"
              style={{ animationDelay: "0.14s" }}
            >
              Essence finds the lines where you told the reader something
              instead of showing it, then asks one precise question at a time
              until the real material comes out.
            </p>

            <div
              className="rise mt-9 flex flex-wrap items-center gap-x-5 gap-y-4"
              style={{ animationDelay: "0.22s" }}
            >
              <Link
                href={primaryHref}
                className="rounded-full bg-accent px-7 py-3.5 text-paper transition hover:opacity-88 hover:shadow-[0_8px_24px_-8px_rgba(122,92,62,0.6)]"
              >
                {primaryLabel}
              </Link>
              <Link
                href="#how"
                className="rounded-full border border-line px-7 py-3.5 text-ink transition hover:border-ink/30 hover:bg-white"
              >
                How it works
              </Link>
            </div>

            <p
              className="rise mt-5 text-sm text-muted"
              style={{ animationDelay: "0.28s" }}
            >
              Free. No card. No AI-written sentences, ever.
            </p>
          </div>

          {/* Third slot, so it starts on the measure's left edge and runs out
              into the note margin — the demo has to sit on the same line the
              headline does or the grid is a claim the page doesn't keep. */}
          <div
            className="spread rise mt-14 sm:mt-16"
            style={{ animationDelay: "0.34s" }}
          >
            <HeroAnnotation />
          </div>
        </section>

        {/* The refusal ----------------------------------------------------- */}
        <section className="sheet border-t border-line py-16 sm:py-24">
          <Reveal className="gloss">
            <Gloss n="01" label="The difference" />
          </Reveal>

          <Reveal delay={0.06}>
            <h2 className="font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Ask it to write for you.
              <br />
              It says no.
            </h2>
            <p className="mt-6 font-serif text-lg leading-relaxed text-muted">
              Every other tool hands you a paragraph and calls it help. The
              admissions officer has read that paragraph a thousand times, and so
              has everyone else applying with it.
            </p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-muted">
              Essence refuses — plainly, every time — and gives you back the
              thing you actually needed: the question you couldn&apos;t ask
              yourself.
            </p>
          </Reveal>

          <Reveal delay={0.12} className="note">
            <div className="space-y-3">
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sm text-paper">
                can you just rewrite that paragraph so it sounds better
              </div>

              <div className="rounded-2xl rounded-bl-md border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-2">
                  <LogoMark className="h-3.5 w-3.5" />
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                    Essence
                  </span>
                </div>
                <p className="mt-2.5 font-serif leading-relaxed text-ink">
                  I won&apos;t write it for you — but let&apos;s get the real
                  material first, and you&apos;ll have something better than
                  anything I&apos;d put there.
                </p>
                <p className="mt-2.5 font-serif leading-relaxed text-ink">
                  What was the next thing you nearly quit, and didn&apos;t?
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* How a session goes ---------------------------------------------- */}
        <section id="how" className="sheet scroll-mt-24 border-t border-line py-16 sm:py-24">
          <Reveal className="gloss">
            <Gloss n="02" label="The loop" />
          </Reveal>

          <Reveal delay={0.06}>
            <h2 className="font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              One read, then one question at a time.
            </h2>

            <ol className="mt-10 space-y-7">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-5 border-t border-line pt-5">
                  <span className="font-wordmark text-2xl leading-none text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-ink">{title}</h3>
                    <p className="mt-1.5 font-serif leading-relaxed text-muted">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* The page marks up its own copy ----------------------------------- */}
        <section className="sheet border-t border-line py-16 sm:py-24">
          <Reveal className="gloss">
            <Gloss n="03" label="Proof" />
          </Reveal>

          <Reveal delay={0.06}>
            <h2 className="font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              We ran this page through it.
            </h2>
            <p className="mt-6 font-serif text-lg leading-relaxed text-muted">
              It flagged our own closing line. Here is the finding, unedited:
            </p>

            <blockquote className="draft-shared-metrics mt-7 rounded-2xl border border-line bg-white text-ink">
              <span className="marked">
                Your essay is already in there. Go find it.
              </span>
            </blockquote>

            <p className="mt-7 font-serif text-lg leading-relaxed text-muted">
              It is right. That sentence could close almost any essay, about
              almost anyone — which is exactly the pattern it names. We kept it,
              because a landing page is allowed a flourish that an application
              essay is not. But you can see how the call gets made, and it is the
              same call it will make on your draft.
            </p>
          </Reveal>

          <Reveal delay={0.12} className="note">
            <div className="rounded-2xl border border-line bg-paper p-5 shadow-[0_10px_30px_-16px_rgba(28,26,23,0.3)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  Generic closing claim
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                  high
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-ink">What is clear</dt>
                  <dd className="mt-0.5 font-serif leading-relaxed text-muted">
                    The writer believes the material is already there.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">Still unexplored</dt>
                  <dd className="mt-0.5 font-serif leading-relaxed text-muted">
                    Nothing specific enough to belong to this page rather than
                    any other.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">Impact</dt>
                  <dd className="mt-0.5 font-serif leading-relaxed text-muted">
                    Polish. Worth knowing, not worth losing the line over.
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </section>

        {/* Where the essay goes -------------------------------------------- */}
        <section className="sheet border-t border-line py-16 sm:py-24">
          <Reveal className="gloss">
            <Gloss n="04" label="Your words" />
          </Reveal>

          <Reveal delay={0.06}>
            <h2 className="font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              You should know where it goes.
            </h2>
            <p className="mt-6 font-serif text-lg leading-relaxed text-muted">
              An application essay is the most personal thing most people write
              before they turn eighteen. It gets read by a language model, and
              which company that is decides what may be done with your words
              afterwards — those terms are not the same everywhere, and on some
              free tiers they permit a human to read what you submitted.
            </p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-muted">
              So Essence names the provider in use and states plainly what its
              terms allow, in the app and on the privacy page. If the current one
              may train on what you paste, that warning sits in the workspace
              where you are pasting — not buried in a policy.
            </p>
            <Link
              href="/settings"
              className="mt-6 inline-flex items-center gap-2 text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
            >
              Read what we store
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </Reveal>
        </section>

        {/* FAQ -------------------------------------------------------------- */}
        <section id="faq" className="sheet scroll-mt-24 border-t border-line py-16 sm:py-24">
          <Reveal className="gloss">
            <Gloss n="05" label="Questions" />
          </Reveal>

          <Reveal delay={0.06}>
            <div className="border-t border-line">
              {FAQ.map(([question, answer]) => (
                <details key={question} className="faq group border-b border-line">
                  <summary className="flex items-start justify-between gap-6 py-5 text-left">
                    <span className="font-wordmark text-2xl leading-tight text-ink transition-colors group-hover:text-accent">
                      {question}
                    </span>
                    <span
                      className="faq-sign mt-2 shrink-0 text-muted"
                      aria-hidden="true"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M7 1v12M1 7h12"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-6 font-serif text-lg leading-relaxed text-muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Close ------------------------------------------------------------ */}
        <section className="border-t border-line py-20 text-center sm:py-28">
          <Reveal>
            <LogoMark className="mx-auto h-10 w-10" />
            <h2 className="mx-auto mt-8 max-w-3xl font-wordmark text-[2.5rem] leading-[1.04] tracking-tight text-ink sm:text-6xl">
              Your essay is already in there.
              <br />
              <em className="italic">Go find it.</em>
            </h2>
            <div className="mt-10">
              <Link
                href={primaryHref}
                className="inline-block rounded-full bg-accent px-8 py-4 text-paper transition hover:opacity-88 hover:shadow-[0_10px_30px_-10px_rgba(122,92,62,0.65)]"
              >
                {primaryLabel}
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              Free. No card. Every word stays yours.
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[78rem] flex-wrap items-center justify-between gap-4 px-6 py-9 text-sm text-muted">
          <span className="flex items-center gap-2.5">
            <LogoMark className="h-5 w-5" />
            Your words, sharper questions.
          </span>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="#how" className="transition-colors hover:text-ink">
              How it works
            </Link>
            <Link href="#faq" className="transition-colors hover:text-ink">
              FAQ
            </Link>
            <Link href="/settings" className="transition-colors hover:text-ink">
              What we store
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
