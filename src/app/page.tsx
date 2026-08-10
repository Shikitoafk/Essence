import Link from "next/link";
import Logo, { LogoMark } from "@/components/Logo";
import Reveal from "@/components/Reveal";
import HeroAnnotation from "@/components/HeroAnnotation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/**
 * Three typefaces, three jobs, and the split is the point:
 *
 *   Instrument Serif  the page speaking as Essence — display only
 *   system sans       interface furniture: labels, chrome, explanation
 *   Georgia           the student's own writing, wherever it appears
 *
 * A draft never renders in the interface's voice. That rule holds in the
 * workspace too (`.draft-shared-metrics`), so the landing page is showing the
 * real product rather than a dressed-up version of it.
 */

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
    "Yes. There is no card, no trial that expires, and no paid tier that unlocks the good feedback. Usage is capped per person so one heavy session can't exhaust the limits for everyone else.",
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero ------------------------------------------------------------ */}
        <section className="pt-16 pb-14 sm:pt-24 sm:pb-20">
          <Reveal className="flex items-center gap-3">
            <span className="h-px w-8 bg-line" aria-hidden="true" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted">
              For college application essays
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-7 max-w-4xl font-wordmark text-[2.75rem] leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              The honest read
              <br />
              your essay <em className="italic">hasn&apos;t had</em>.
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
              Essence finds the lines where you told the reader something
              instead of showing it, then asks one precise question at a time
              until the real material comes out.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-4">
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
              <span className="text-sm text-muted">
                Free. No card. No AI-written sentences, ever.
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.3} className="mt-14 sm:mt-20">
            <HeroAnnotation />
          </Reveal>
        </section>

        {/* The refusal ----------------------------------------------------- */}
        <section className="border-t border-line py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
            <Reveal>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted">
                The part everyone else gets wrong
              </p>
              <h2 className="mt-4 font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Ask it to write for you.
                <br />
                It says no.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-muted">
                Every other tool hands you a paragraph and calls it help. The
                admissions officer has read that paragraph a thousand times, and
                so has everyone else applying with it.
              </p>
              <p className="mt-4 max-w-md leading-relaxed text-muted">
                Essence refuses — plainly, every time — and gives you back the
                thing you actually needed: the question you couldn&apos;t ask
                yourself.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="space-y-3">
                <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-ink px-5 py-3.5 text-paper">
                  <p className="leading-relaxed">
                    can you just rewrite that paragraph so it sounds better
                  </p>
                </div>

                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-white px-5 py-4">
                  <div className="flex items-center gap-2">
                    <LogoMark className="h-4 w-4" />
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                      Essence
                    </span>
                  </div>
                  <p className="mt-3 leading-relaxed text-ink">
                    I won&apos;t write it for you — but let&apos;s get the real
                    material first, and you&apos;ll have something better than
                    anything I&apos;d put there.
                  </p>
                  <p className="mt-3 leading-relaxed text-ink">
                    What was the next thing you nearly quit, and didn&apos;t?
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* How a session goes ---------------------------------------------- */}
        <section id="how" className="scroll-mt-24 border-t border-line py-16 sm:py-24">
          <Reveal>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted">
              How a session goes
            </p>
            <h2 className="mt-4 max-w-2xl font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
              One read, then one question at a time.
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, body], i) => (
              <Reveal as="li" key={title} delay={i * 0.08}>
                <div className="flex items-baseline gap-3 border-t border-line pt-5">
                  <span className="font-wordmark text-3xl leading-none text-accent">
                    {i + 1}
                  </span>
                  <h3 className="font-medium text-ink">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Where the essay goes -------------------------------------------- */}
        <section className="border-t border-line py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted">
                Before you paste anything
              </p>
              <h2 className="mt-4 font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
                You should know where it goes.
              </h2>
            </Reveal>

            <Reveal delay={0.1} className="space-y-5">
              <p className="leading-relaxed text-muted">
                An application essay is the most personal thing most people
                write before they turn eighteen. It gets read by a language
                model, and which company that is decides what may be done with
                your words afterwards — those terms are not the same everywhere,
                and on some free tiers they permit a human to read what you
                submitted.
              </p>
              <p className="leading-relaxed text-muted">
                So Essence names the provider in use and states plainly what its
                terms allow, in the app and on the privacy page. If the current
                one may train on what you paste, that warning sits in the
                workspace where you are pasting — not buried in a policy.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
              >
                Read what we store
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* FAQ -------------------------------------------------------------- */}
        <section id="faq" className="scroll-mt-24 border-t border-line py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <Reveal>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted">
                FAQ
              </p>
              <h2 className="mt-4 font-wordmark text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Questions,
                <br />
                <em className="italic">answered</em>.
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="border-t border-line">
                {FAQ.map(([question, answer]) => (
                  <details key={question} className="faq group border-b border-line">
                    <summary className="flex items-start justify-between gap-6 py-5 text-left">
                      <span className="font-medium text-ink transition-colors group-hover:text-accent">
                        {question}
                      </span>
                      <span
                        className="faq-sign mt-1 shrink-0 text-muted"
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
                    <p className="max-w-prose pb-6 leading-relaxed text-muted">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-9 text-sm text-muted">
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
