"use client";

import { useState } from "react";
import Link from "next/link";
import { restoreEssay } from "@/app/actions";
import type { Essay } from "@/lib/types";

/**
 * Versions that lost a comparison. Collapsed by design — they stay readable and
 * restorable, but keeping them as visible as the winner is exactly what turns a
 * settled decision back into an open one.
 */
export default function ArchivedList({ essays }: { essays: Essay[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-lg border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm"
      >
        <span className="text-muted">Archived ({essays.length})</span>
        <span className="text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {essays.map((essay) => (
            <li
              key={essay.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <Link
                  href={`/essays/${essay.id}`}
                  className="font-serif text-base hover:text-accent"
                >
                  {essay.title}
                </Link>
                <p className="text-xs text-muted">
                  {essay.archived_reason === "lost_comparison"
                    ? "Not chosen in a comparison"
                    : "Archived"}
                </p>
              </div>

              <form action={restoreEssay}>
                <input type="hidden" name="essayId" value={essay.id} />
                <button
                  type="submit"
                  className="rounded-full border border-line px-3 py-1 text-xs hover:border-accent"
                >
                  Restore
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
