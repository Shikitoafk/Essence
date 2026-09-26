"use client";

import { useState } from "react";
import TrackedAuthLink from "./TrackedAuthLink";
import {
  MAX_TRIAL_WORDS,
  MIN_TRIAL_WORDS,
  type TrialReadResult,
} from "@/lib/ai/trialPrompt";
import {
  getAnonymousId,
  trackProductEvent,
} from "@/lib/productAnalytics";

const SYNTHETIC_SAMPLE = `Two nights before regionals, our robot stopped reading the line on the floor. I split the repair into tasks and kept everyone moving. Maya wanted to rebuild the sensor mount; I told her we did not have time.

After our second failed test, we finally tried her idea. The robot crossed the course at 1:42 a.m. We cheered quietly so the custodian would not send us home. That night taught me that leadership is not having every answer, but helping people find one together.`;

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default function SampleReadDemo() {
  const [draft, setDraft] = useState("");
  const [essayPrompt, setEssayPrompt] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [read, setRead] = useState<TrialReadResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [materialShown, setMaterialShown] = useState(false);

  const wordCount = countWords(draft);
  const validLength =
    wordCount >= MIN_TRIAL_WORDS && wordCount <= MAX_TRIAL_WORDS;

  function updateDraft(value: string) {
    setDraft(value);
    setRead(null);
    setAnswer("");
    setMaterialShown(false);
    setError("");
  }

  async function runTrial() {
    if (!validLength || !acceptedPolicy || loading) return;

    setLoading(true);
    setError("");
    setRead(null);
    setMaterialShown(false);
    trackProductEvent("sample_started", { word_count: wordCount });

    try {
      const response = await fetch("/api/trial-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draft,
          essayPrompt: essayPrompt.trim() || undefined,
          anonymousId: getAnonymousId(),
          acceptedPolicy,
        }),
      });
      const payload = (await response.json()) as
        | TrialReadResult
        | { error?: string };

      if (!response.ok || !("status" in payload)) {
        setError(
          "error" in payload && payload.error
            ? payload.error
            : "Essence could not read this excerpt right now. Please try again later.",
        );
        return;
      }

      setRead(payload);
      trackProductEvent("sample_completed", {
        status: payload.status,
        word_count: wordCount,
      });
    } catch {
      setError("Essence could not connect right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white shadow-[0_35px_90px_-65px_rgba(18,21,24,0.9)]">
      <div className="grid lg:grid-cols-[1.03fr_0.97fr]">
        <section className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-eyebrow">One real read · No account</p>
              <h3 className="mt-3 font-display text-4xl font-medium tracking-[-0.05em]">
                Give us the difficult part.
              </h3>
            </div>
            <span className="shrink-0 rounded-full border border-line px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
              Once per day
            </span>
          </div>

          <label
            htmlFor="trial-draft"
            className="mt-7 block text-xs font-medium uppercase tracking-[0.12em] text-muted"
          >
            Essay excerpt
          </label>
          <textarea
            id="trial-draft"
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            disabled={Boolean(read)}
            rows={11}
            placeholder="Paste one passage you are unsure about…"
            className="mt-2 w-full resize-y rounded-2xl border border-ink/10 bg-[#f8f8f5] px-4 py-4 font-serif text-[1.02rem] leading-7 text-ink outline-none transition focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_rgba(98,84,245,0.08)]"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => updateDraft(SYNTHETIC_SAMPLE)}
              disabled={Boolean(read)}
              className="font-medium text-accent transition hover:text-[#4849c8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use a synthetic example
            </button>
            <span
              className={
                wordCount > MAX_TRIAL_WORDS ? "text-red-600" : "text-muted"
              }
            >
              {wordCount} / {MAX_TRIAL_WORDS} words · minimum {MIN_TRIAL_WORDS}
            </span>
          </div>

          <label
            htmlFor="trial-prompt"
            className="mt-6 block text-xs font-medium uppercase tracking-[0.12em] text-muted"
          >
            Essay prompt <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="trial-prompt"
            value={essayPrompt}
            onChange={(event) => setEssayPrompt(event.target.value)}
            disabled={Boolean(read)}
            maxLength={500}
            placeholder="What is the school asking you to answer?"
            className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
          />

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-[#f6f6f2] p-4">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(event) => setAcceptedPolicy(event.target.checked)}
              disabled={Boolean(read)}
              className="mt-1 h-4 w-4 accent-[#5b5ce2]"
            />
            <span className="text-xs leading-5 text-muted">
              I understand this excerpt is sent to Gemini&apos;s unpaid tier,
              whose terms permit Google to use submissions to improve products
              and allow human review. I removed sensitive information. Essence
              does not save this trial excerpt.
            </span>
          </label>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!validLength || !acceptedPolicy || loading || Boolean(read)}
            onClick={runTrial}
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            {loading
              ? "Reading the whole excerpt…"
              : read
                ? "Trial complete"
                : "Get one Essence question"}
          </button>
        </section>

        <section
          className="bg-[#111417] p-6 text-white sm:p-8 lg:p-12"
          aria-live="polite"
        >
          {!read ? (
            <div className="flex min-h-[34rem] items-center justify-center text-center">
              <div className="max-w-xs">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-xl text-mark">
                  ?
                </span>
                <p className="mt-5 font-display text-3xl font-medium tracking-[-0.045em] text-white">
                  One finding. One question.
                </p>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  Essence reads the whole excerpt, finds the highest-leverage
                  gap, and asks for material only you can supply. If the passage
                  is already doing its job, it will leave it alone.
                </p>
              </div>
            </div>
          ) : read.status === "finding" ? (
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent">
                Still unexplored
              </p>
              <blockquote className="mt-4 border-l-2 border-mark/50 pl-4 font-serif text-lg leading-7 text-white/88">
                “{read.quote}”
              </blockquote>
              <p className="mt-4 text-sm leading-6 text-white/48">
                {read.diagnosis}
              </p>

              <div className="mt-6 rounded-2xl border border-mark/20 bg-white/[0.055] p-5">
                <p className="text-xs font-medium uppercase tracking-[0.13em] text-accent">
                  Answer this
                </p>
                <p className="mt-3 font-serif text-xl leading-7 text-white">
                  {read.question}
                </p>
                <textarea
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setMaterialShown(false);
                  }}
                  rows={4}
                  placeholder="Follow the question in your own words…"
                  className="mt-5 w-full resize-none rounded-xl border border-white/12 bg-black/20 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-mark/50"
                />
                <p className="mt-2 text-xs leading-5 text-white/35">
                  This answer stays in your browser. It is not sent anywhere.
                </p>
                <button
                  type="button"
                  disabled={!answer.trim()}
                  onClick={() => setMaterialShown(true)}
                  className="mt-3 rounded-full bg-mark px-5 py-2.5 text-sm font-semibold text-[#11140f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Keep this material
                </button>

                {materialShown && (
                  <div className="mt-5 rounded-xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-mark">
                      Material found
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/82">{answer}</p>
                    <p className="mt-3 text-xs leading-5 text-white/38">
                      Essence stops here. You decide whether and how this belongs
                      in the draft.
                    </p>
                  </div>
                )}
              </div>

              {read.whatLands && (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/32">
                    What already lands
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/45">
                    {read.whatLands}
                  </p>
                </div>
              )}

              <TrackedAuthLink
                href="/login"
                source="real_trial_completed"
                className="mt-6 inline-flex rounded-full bg-mark px-5 py-3 text-sm font-semibold text-[#11140f] transition hover:bg-white"
              >
                Read my complete essay
              </TrackedAuthLink>
            </div>
          ) : (
            <div className="flex min-h-[34rem] items-center justify-center">
              <div className="max-w-sm text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mark/15 text-xl text-mark">
                  ✓
                </span>
                <p className="mt-5 font-display text-2xl font-medium tracking-[-0.035em] text-white">
                  No meaningful gap in this excerpt.
                </p>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  Essence would leave this passage alone rather than manufacture
                  a problem.
                </p>
                <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-left text-sm leading-6 text-white/75">
                  {read.whatLands || read.diagnosis}
                </p>
                <TrackedAuthLink
                  href="/login"
                  source="real_trial_completed"
                  className="mt-6 inline-flex rounded-full bg-mark px-5 py-3 text-sm font-semibold text-[#11140f] transition hover:bg-white"
                >
                  Read my complete essay
                </TrackedAuthLink>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
