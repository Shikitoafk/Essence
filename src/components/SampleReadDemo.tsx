"use client";

import { useState } from "react";
import TrackedAuthLink from "./TrackedAuthLink";
import { trackProductEvent } from "@/lib/productAnalytics";

const SAMPLE_ANSWER =
  "Maya asked why I was protecting a plan that had already failed twice. I stopped assigning tasks and asked her to walk us through the sensor idea I had dismissed.";

export default function SampleReadDemo() {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [answer, setAnswer] = useState("");

  function start() {
    setStage(1);
    trackProductEvent("sample_started");
  }

  function finish() {
    if (!answer.trim()) setAnswer(SAMPLE_ANSWER);
    setStage(2);
    trackProductEvent("sample_completed", {
      answer_length: answer.trim() ? Math.min(answer.trim().length, 500) : 0,
    });
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_28px_70px_-52px_rgba(23,32,51,0.55)]">
      <div className="grid lg:grid-cols-[1.03fr_0.97fr]">
        <section className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-eyebrow">Synthetic sample · 118 words</p>
              <h3 className="mt-3 font-display text-3xl font-medium tracking-[-0.04em]">
                Try the reading flow
              </h3>
            </div>
            <span className="rounded-full border border-line px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
              No account
            </span>
          </div>

          <div className="mt-7 font-serif text-[1.03rem] leading-8 text-ink">
            <p>
              Two nights before regionals, our robot stopped reading the line
              on the floor. I split the repair into tasks and kept everyone
              moving. Maya wanted to rebuild the sensor mount; I told her we did
              not have time.
            </p>
            <p className="mt-4">
              After our second failed test, we finally tried her idea. The robot
              crossed the course at 1:42 a.m. We cheered quietly so the custodian
              would not send us home. That night taught me that leadership is
              not having every answer, but helping people find one together.
            </p>
          </div>

          {stage === 0 && (
            <button
              type="button"
              onClick={start}
              className="mt-8 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#4849c8]"
            >
              Show what Essence notices
            </button>
          )}
        </section>

        <section className="bg-[#f8f9fc] p-6 sm:p-8 lg:p-10" aria-live="polite">
          {stage === 0 ? (
            <div className="flex min-h-[25rem] items-center justify-center text-center">
              <div className="max-w-xs">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-xl text-accent">
                  ?
                </span>
                <p className="mt-5 font-display text-2xl font-medium tracking-[-0.035em]">
                  No score. No rewrite.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Press the button to see the exact line Essence would stop at
                  and the question it would ask.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent">
                Still unexplored
              </p>
              <blockquote className="mt-4 border-l-2 border-accent/40 pl-4 font-serif text-lg leading-7 text-ink">
                “That night taught me that leadership is not having every
                answer…”
              </blockquote>
              <p className="mt-4 text-sm leading-6 text-muted">
                The conclusion is plausible, but the draft skips the instant
                when listening replaced control.
              </p>

              <div className="mt-6 rounded-2xl border border-accent/25 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-[0.13em] text-accent">
                  Answer this
                </p>
                <p className="mt-3 font-serif text-xl leading-7 text-ink">
                  What did Maya say that made you stop defending your original
                  plan?
                </p>

                {stage === 1 ? (
                  <>
                    <textarea
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      rows={4}
                      placeholder="Type a thought, or leave this blank to reveal a sample answer. Nothing you type here is sent anywhere."
                      className="mt-5 w-full resize-none rounded-xl border border-line bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={finish}
                      className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent"
                    >
                      {answer.trim() ? "Surface the material" : "Show a sample answer"}
                    </button>
                  </>
                ) : (
                  <div className="mt-5 rounded-xl bg-accent-soft/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
                      Material found
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink">
                      {answer || SAMPLE_ANSWER}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      Essence stops here. The student decides whether and how
                      this belongs in the draft.
                    </p>
                  </div>
                )}
              </div>

              {stage === 2 && (
                <TrackedAuthLink
                  href="/login"
                  source="sample_completed"
                  className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4849c8]"
                >
                  Try it on my essay
                </TrackedAuthLink>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
