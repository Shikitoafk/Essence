"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "essence.workspace-guide-dismissed";

const STEPS = [
  {
    title: "Write on the left, read on the right",
    body: "Your draft stays yours the whole time. Nothing Essence produces can be pasted into it — there's no insert button anywhere, on purpose.",
  },
  {
    title: "Three tabs, one read",
    body: "Spots are every specific line Essence found worth working on. Full read explains the structure and what already works. Follow-up is where the questions live.",
  },
  {
    title: "You can ask, not just answer",
    body: "Stuck on a card, or don't see what it wants? Type it and press Ask instead. Nothing gets marked or judged — you just get an answer.",
  },
  {
    title: "Questions come one at a time",
    body: "Press New question when you're ready for the next one. A vague answer gets a narrower question, not a pass — and \"nothing here\" is a valid answer.",
  },
  {
    title: "A spot closes when the draft changes",
    body: "Answering gathers the material; the card goes amber. It only turns resolved once you've rewritten that line yourself.",
  },
];

/**
 * Shown once per browser, dismissible for good.
 *
 * The workspace does something unusual — it refuses to write for you — so beta
 * testers arrived without a model for what they were looking at. But five
 * explanations in a two-column grid is a wall standing between a student and
 * their own essay, and it was the first thing on the screen every time until
 * somebody thought to dismiss it. It opens as one line now: the offer stays,
 * the wall does not, and reading it is a choice rather than a toll.
 */
export default function FirstRunGuide() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Private mode or blocked storage: skip the guide rather than nag.
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Not remembering is better than blocking dismissal.
    }
  }

  if (!visible) return null;

  return (
    <section className="border-t border-line bg-accent-soft/40 px-6 py-2">
      <div className="mx-auto max-w-[110rem]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            First time here?{" "}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-ink underline underline-offset-2"
            >
              {open ? "Hide how this works" : "How this works"}
            </button>
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-ink"
          >
            Got it
          </button>
        </div>

        {open && (
          <ul className="mt-3 grid gap-x-8 gap-y-2 pb-2 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.title} className="text-sm">
                <span className="font-medium">{step.title}.</span>{" "}
                <span className="text-muted">{step.body}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
