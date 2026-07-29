import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

const TESTIMONIALS = [
  {
    quote:
      "I'd written \"it changed how I see my family\" four times. Essence asked what I did differently the next Sunday. That answer became the whole ending.",
    name: "Placeholder — replace with a real quote",
    detail: "Common App personal statement",
  },
  {
    quote:
      "It never gave me a sentence. Annoying for about ten minutes, then it was the only feedback that actually sounded like me.",
    name: "Placeholder — replace with a real quote",
    detail: "Transfer applicant",
  },
  {
    quote:
      "My counselor said the third draft read like a different writer. It was the same writer — I'd just finally put the real details in.",
    name: "Placeholder — replace with a real quote",
    detail: "Why Us supplement",
  },
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

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-serif text-xl tracking-tight">Essence</span>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/settings" className="text-muted hover:text-ink">
            Privacy
          </Link>
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-ink px-4 py-2 text-paper hover:opacity-90"
            >
              Your essays
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-ink px-4 py-2 text-paper hover:opacity-90"
            >
              Start free
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 sm:py-24">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">
            Get sharper questions,
            <br />
            not rewritten sentences.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Every word stays yours. Essence reads your draft, finds the moments
            where you told the reader something instead of showing it, and asks
            one precise question at a time until the real material comes out.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href={signedIn ? "/dashboard" : "/login"}
              className="rounded-full bg-accent px-6 py-3 text-paper transition hover:opacity-90"
            >
              {signedIn ? "Go to your essays" : "Start free"}
            </Link>
            <span className="text-sm text-muted">
              No payment. No AI-written sentences. Ever.
            </span>
          </div>
        </section>

        <section className="border-t border-line py-16">
          <p className="text-xs uppercase tracking-widest text-muted">
            What it actually does
          </p>
          <h2 className="mt-3 font-serif text-2xl">
            It points at one line and asks one thing.
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-6">
              <p className="text-xs uppercase tracking-widest text-muted">
                Your draft
              </p>
              <p className="draft-shared-metrics mt-2 !p-0 text-ink">
                I spent that summer cataloguing beetles in my grandfather&apos;s
                garage.{" "}
                <span className="quote-mark">
                  The work taught me patience, and I became someone who finishes
                  what he starts.
                </span>{" "}
                By August the drawers were full.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-white p-6">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  Underdeveloped change
                </span>
                <span className="text-xs text-muted">confidence: high</span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium">What is clear</dt>
                  <dd className="text-muted">
                    You spent a long, repetitive summer on one task and stayed
                    with it.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">What is still unexplored</dt>
                  <dd className="text-muted">
                    Not one moment where finishing something actually looked
                    different than it used to.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Why it matters here</dt>
                  <dd className="text-muted">
                    This is the essay&apos;s claim about who you are, and right
                    now it&apos;s asserted rather than shown.
                  </dd>
                </div>
              </dl>
              <div className="mt-5 rounded-md bg-accent-soft/60 p-4 text-sm">
                <p className="text-xs uppercase tracking-widest text-accent">
                  The question you&apos;d get
                </p>
                <p className="mt-2">
                  What was the next thing you nearly quit — and didn&apos;t?
                  Could be that same week, that autumn, or much later.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm text-muted">
            There is no button that puts any of this into your essay. That&apos;s
            deliberate — the answer you type back is raw material for{" "}
            <em>you</em> to write with, not text to paste.
          </p>
        </section>

        <section className="border-t border-line py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.quote} className="text-sm">
                <blockquote className="font-serif text-base leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-3 text-muted">
                  <span className="block">{t.name}</span>
                  <span className="block text-xs">{t.detail}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-16">
          <h2 className="font-serif text-2xl">How a session goes</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-4">
            {[
              ["Paste your draft", "Set the prompt and word limit if you have them."],
              ["One deep read", "A full structural diagnostic, in a single pass."],
              ["One question at a time", "Vague answers get a narrower question, not a pass."],
              ["Rewrite it yourself", "Save a version. Run it again. Watch spots close."],
            ].map(([title, body], i) => (
              <li key={title}>
                <span className="font-serif text-2xl text-accent">{i + 1}</span>
                <h3 className="mt-1 font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted">
          <span>Essence — your words, sharper questions.</span>
          <Link href="/settings" className="hover:text-ink">
            What we store
          </Link>
        </div>
      </footer>
    </div>
  );
}
