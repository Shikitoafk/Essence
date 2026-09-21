import Link from "next/link";
import Logo from "@/components/Logo";
import { dataPolicy } from "@/lib/ai/llm";

export const metadata = {
  title: "Privacy — Essence",
  description:
    "Where Essence stores your draft, when it is sent to an AI model, and what anonymous product events are measured.",
};

export default function PrivacyPage() {
  const policy = dataPolicy();

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo />
          <Link
            href="/"
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-accent"
          >
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="section-eyebrow">Privacy, in plain language</p>
        <h1 className="mt-4 font-display text-5xl font-medium tracking-[-0.055em] text-ink sm:text-6xl">
          Your essay is personal. Know where it goes.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          Essence stores your drafts so you can revise them. It sends text to
          the feedback model only when you explicitly request a read or send a
          follow-up answer.
        </p>

        <div className="mt-12 space-y-5">
          <PrivacySection title="Stored in your account">
            <p>
              Supabase stores your drafts, saved versions, flagged passages,
              follow-up conversations and the small facts you choose to carry
              across sessions. Row-level security limits those records to your
              signed-in account. Deleting an essay removes its versions,
              feedback and conversation.
            </p>
          </PrivacySection>

          <PrivacySection title="Sent for feedback">
            <p>
              A draft is sent to {policy.providerLabel} only when you press Get
              feedback. A follow-up thread is sent when you answer or ask a
              question. Essence does not send every keystroke while you edit.
            </p>
            <p
              className={`mt-4 rounded-xl p-4 ${
                policy.safeForPersonalContent
                  ? "bg-flag-low/10"
                  : "bg-flag-medium/10"
              }`}
            >
              {policy.summary}
            </p>
            {!policy.safeForPersonalContent && (
              <p className="mt-4 font-medium text-ink">
                Do not paste names, medical details, private documents or
                anything you would not want an outside reviewer to see.
              </p>
            )}
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-accent underline underline-offset-2"
            >
              Read Google&apos;s Gemini API terms
            </a>
          </PrivacySection>

          <PrivacySection title="Measured without essay text">
            <p>
              Essence counts page views and a short list of product events: for
              example, whether someone completed the sample, requested a first
              read, answered a question, rated feedback or copied an invite
              link. These events contain small labels and counts. They never
              contain a draft, quoted passage, answer, free-form feedback,
              email address or name.
            </p>
            <p className="mt-4">
              A random browser identifier connects those steps into a funnel.
              It is not used for advertising and is not shared with ad
              networks. There are no ad pixels or cross-site trackers.
            </p>
          </PrivacySection>

          <PrivacySection title="The sample is local">
            <p>
              The interactive sample on the home page uses a synthetic draft.
              Anything you type into its demonstration answer box stays in your
              browser and is never sent to Essence or an AI model. Only the fact
              that the sample was completed is counted.
            </p>
          </PrivacySection>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            Open my account
          </Link>
          <Link
            href="/#try"
            className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-ink"
          >
            Try the sample
          </Link>
        </div>
      </main>
    </div>
  );
}

function PrivacySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-7">
      <h2 className="font-display text-2xl font-medium tracking-[-0.035em] text-ink">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}
