import Link from "next/link";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import QuestionPathPreview from "@/components/QuestionPathPreview";
import ReferralCapture from "@/components/ReferralCapture";
import Reveal from "@/components/Reveal";
import SampleReadDemo from "@/components/SampleReadDemo";
import { dataPolicy } from "@/lib/ai/llm";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const FAQ = [
  [
    "Will Essence write my essay?",
    "No. Essence identifies the decision your draft still needs and asks one question. It never supplies replacement prose, a paste-ready ending, or an imitation of your voice.",
  ],
  [
    "How is this different from an essay score?",
    "A score compresses the reading into a number. Essence shows the exact line where the reader loses the person, explains the cost, and gives you a way to work on it.",
  ],
  [
    "Does every draft get criticism?",
    "No. A finished passage is allowed to remain finished. Essence also marks the language that is already carrying your voice so you know what not to polish away.",
  ],
  [
    "Can it read supplemental essays?",
    "Yes. Add the original prompt and word limit. Essence judges the response against that task instead of silently turning every supplement into a personal statement or Why Us essay.",
  ],
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d={diagonal ? "M5 15 15 5m-7 0h7v7" : "M3 10h13m-5-5 5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="m4 10.5 3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home() {
  let signedIn = false;
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  const appHref = signedIn ? "/dashboard" : "/login";
  const policy = dataPolicy();

  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      <Suspense fallback={null}><ReferralCapture /></Suspense>

      <section className="landing-stage">
        <header className="relative z-20 mx-auto flex max-w-[90rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Main navigation">
            <a href="#intelligence" className="transition hover:text-ink">How it reads</a>
            <a href="#try" className="transition hover:text-ink">Live trial</a>
            <a href="#faq" className="transition hover:text-ink">Questions</a>
          </nav>
          <Link href={appHref} className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent">
            {signedIn ? "Open workspace" : "Start free"}<Arrow />
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[90rem] items-start gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:pb-24 lg:pt-14">
          <div className="rise max-w-[44rem]">
            <div className="inline-flex items-center gap-2 border-b border-ink/20 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              A close reader for application essays
            </div>
            <h1 className="mt-6 max-w-[13ch] font-serif text-[3.35rem] font-medium leading-[0.96] tracking-[-0.045em] text-ink sm:text-[4.15rem] lg:text-[4.7rem]">
              See what your essay reveals—and what it still hides.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted sm:text-xl">
              Essence reads for the person behind the prose, points to the exact place a reader loses them, and asks one useful question at a time.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={signedIn ? appHref : "#try"} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent">
                {signedIn ? "Continue my essays" : "Try it on my writing"}<Arrow />
              </Link>
              <a href="#intelligence" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-3.5 text-sm font-medium text-ink transition hover:border-ink">
                See how it reads
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted">
              {[
                "Never writes for you",
                "Every finding anchored",
                "Knows when to stop",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2"><span className="text-accent"><Check /></span>{item}</span>
              ))}
            </div>
          </div>

          <div className="rise hero-product-frame min-w-0 [animation-delay:120ms]">
            <QuestionPathPreview />
          </div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-[90rem] border-t border-ink/12 px-5 sm:grid-cols-3 sm:px-8 lg:px-10">
          {[
            ["01", "Whole-draft first", "Essence understands the person before diagnosing a line."],
            ["02", "Smallest useful question", "No automatic demand for another scene, feeling, or detail."],
            ["03", "A real stopping point", "When further editing would flatten the voice, Essence says stop."],
          ].map(([number, title, copy]) => (
            <div key={number} className="border-b border-ink/10 py-6 sm:border-b-0 sm:border-r sm:px-7 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
              <p className="font-mono text-[0.6rem] tracking-[0.18em] text-accent">{number}</p>
              <p className="mt-3 text-sm font-medium text-ink">{title}</p>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="intelligence" className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 lg:px-10 lg:py-36">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div className="lg:sticky lg:top-10 lg:self-start">
              <p className="section-eyebrow">What the reading looks for</p>
              <h2 className="mt-5 max-w-md font-display text-5xl font-medium leading-[0.98] tracking-[-0.06em] text-ink sm:text-6xl">
                Read the draft without losing sight of the writer.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-muted">
                An unusual topic can reveal very little. A familiar story can feel unmistakably personal. The difference is usually in what the writer notices, chooses, and leaves unresolved.
              </p>
            </div>

            <div className="intelligence-grid">
              <article className="intelligence-card intelligence-card-featured">
                <span className="intelligence-number">01</span>
                <div>
                  <p className="intelligence-label">Topic ≠ subject</p>
                  <h3>“Minecraft” is material. What your mind does with it is the essay.</h3>
                  <p>Essence strips away the activity names and asks what pattern of noticing, choosing, resisting, or building remains.</p>
                </div>
              </article>
              <article className="intelligence-card">
                <span className="intelligence-number">02</span>
                <div>
                  <p className="intelligence-label">Voice is perception</p>
                  <h3>Voice is more than slang, humor, or a dramatic confession.</h3>
                  <p>It is what you notice that another person would walk past—and the comparisons your mind makes without being asked.</p>
                </div>
              </article>
              <article className="intelligence-card intelligence-card-dark">
                <span className="intelligence-number">03</span>
                <div>
                  <p className="intelligence-label">Seams before symptoms</p>
                  <h3>One structural decision can remove five fake “detail gaps.”</h3>
                  <p>Essence reads the whole draft before sweeping paragraphs, so it does not bury the real problem under local questions.</p>
                </div>
              </article>
              <article className="intelligence-card intelligence-card-mark">
                <span className="intelligence-number">04</span>
                <div>
                  <p className="intelligence-label">Restraint is a feature</p>
                  <h3>A finished essay is allowed to remain finished.</h3>
                  <p>Working passages are protected. Taste is not inflated into substance. Zero findings is a valid answer.</p>
                </div>
              </article>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="try" className="trial-stage scroll-mt-8 border-y border-line/70 py-24 lg:py-32">
        <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-10">
          <Reveal>
            <div className="mb-12 grid gap-5 lg:grid-cols-[1fr_0.65fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Read a real passage</p>
                <h2 className="mt-5 max-w-3xl font-display text-5xl font-medium leading-[0.96] tracking-[-0.06em] text-ink sm:text-7xl">
                  Bring the passage you&apos;re stuck on.
                </h2>
              </div>
              <p className="max-w-lg text-base leading-7 text-muted lg:justify-self-end">
                Paste a 40–220 word excerpt. Get one real finding and one question. No account, no saved draft, no invented problem if the passage already works.
              </p>
            </div>
            <SampleReadDemo />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8 lg:px-10 lg:py-36">
        <Reveal>
          <div className="manifesto-panel overflow-hidden rounded-[1.25rem]">
            <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
              <div className="p-8 sm:p-12 lg:p-16">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#b9c9b5]">The ownership rule</p>
                <blockquote className="mt-8 max-w-3xl font-serif text-4xl leading-[1.08] tracking-[-0.025em] text-white sm:text-5xl lg:text-[4rem]">
                  “The next sentence still has to come from you.”
                </blockquote>
                <p className="mt-8 max-w-xl leading-7 text-white/48">
                  Your memories, judgments, contradictions, jokes, and language stay yours. The product makes the reading sharper without taking authorship away.
                </p>
              </div>
              <div className="manifesto-side flex flex-col justify-between border-t border-white/10 p-8 sm:p-12 lg:border-l lg:border-t-0">
                <div>
                  <p className="text-sm text-white/40">What Essence returns</p>
                  <ul className="mt-7 space-y-5">
                    {[
                      "The person the draft currently reveals",
                      "Every meaningful reader loss, tied to a line",
                      "One question per independent decision",
                      "The passages revision should leave alone",
                      "A clear signal when the essay is ready",
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-white/78"><span className="mt-1 text-[#b9c9b5]"><Check /></span>{item}</li>
                    ))}
                  </ul>
                </div>
                <Link href={appHref} className="mt-12 inline-flex items-center justify-between rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:border-white/45">
                  {signedIn ? "Return to my workspace" : "Build my essay workspace"}<Arrow diagonal />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-5 pb-28 sm:px-8 lg:pb-36">
        <Reveal>
          <p className="section-eyebrow text-center">Clear boundaries</p>
          <h2 className="mt-5 text-center font-display text-5xl font-medium tracking-[-0.055em] text-ink sm:text-6xl">Good feedback knows its limits.</h2>
        </Reveal>
        <div className="modern-faq mt-12 border-t border-ink/12">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="group border-b border-ink/12 py-1">
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-6 text-lg font-medium text-ink">
                <span>{question}</span><span className="text-3xl font-light text-accent transition group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pb-6 pr-10 leading-7 text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="final-stage mx-auto max-w-[96rem] overflow-hidden rounded-[1.25rem] px-6 py-16 text-center sm:px-12 sm:py-24">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">The draft is already yours</p>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-medium leading-[0.94] tracking-[-0.065em] text-ink sm:text-7xl lg:text-[5.5rem]">Give it a careful reader.</h2>
          <p className="mx-auto mt-6 max-w-xl leading-7 text-muted">Start with one excerpt. Keep every sentence unmistakably your own.</p>
          <Link href={signedIn ? appHref : "#try"} className="mt-9 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent">
            {signedIn ? "Open workspace" : "Try Essence free"}<Arrow />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-9 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <Logo />
        <p>Read the person. Protect the voice.</p>
        <div className="flex gap-6"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/login" className="hover:text-ink">Log in</Link></div>
      </footer>

      {!policy.safeForPersonalContent && (
        <p className="sr-only">The trial uses Gemini&apos;s unpaid tier. Its data terms are shown before any excerpt is submitted.</p>
      )}
    </main>
  );
}
