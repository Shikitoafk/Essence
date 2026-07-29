"use client";

import { useState, useTransition } from "react";
import { forgetAllFacts, forgetFact } from "@/app/actions";
import type { EssayFact } from "@/lib/types";

export default function FactsManager({ facts }: { facts: EssayFact[] }) {
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [wipedAll, setWipedAll] = useState(false);

  const visible = wipedAll ? [] : facts.filter((f) => !removed.has(f.id));

  if (facts.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        Nothing remembered yet. Facts appear here once you start answering
        follow-up questions.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {visible.length === 0 ? (
        <p className="text-sm text-muted">Cleared.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((fact) => (
              <li
                key={fact.id}
                className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm"
              >
                <span>{fact.fact}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setRemoved((prev) => new Set(prev).add(fact.id));
                      await forgetFact(fact.id);
                    })
                  }
                  className="shrink-0 text-xs text-muted hover:text-flag-high"
                >
                  Forget
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setWipedAll(true);
                await forgetAllFacts();
              })
            }
            className="mt-4 rounded-full border border-line px-4 py-2 text-xs hover:border-flag-high hover:text-flag-high"
          >
            Forget everything
          </button>
        </>
      )}
    </div>
  );
}
