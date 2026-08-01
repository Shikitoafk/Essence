"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "essence.workspace-guide-dismissed";

const STEPS = [
  {
    title: "Write on the left, read on the right",
    body: "Your draft stays yours the whole time. Nothing Essence produces can be pasted into it — there's no insert button anywhere, on purpose.",
  },
  {
    title: "Spots vs Full read",
    body: "Spots are the specific lines to work on. Full read is the whole structural diagnostic — the framework, the priorities, and what's already working. Two tabs, same read.",
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
 * The workspace has three panes and two tabs and does something unusual — it
 * refuses to write for you — so beta testers arrived without a model for what
 * they were looking at. The one thing this must not do is nag: it appears once,
 * and the dismissal sticks.
 */
export default function FirstRunGuide() {
  const [visible, setVisible] = useState(false);

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
    <section className="border-t border-line bg-accent-soft/40 px-6 py-4">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-base">How this works</h2>
          <ul className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.title} className="text-sm">
                <span className="font-medium">{step.title}.</span>{" "}
                <span className="text-muted">{step.body}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-accent"
        >
          Got it
        </button>
      </div>
    </section>
  );
}
