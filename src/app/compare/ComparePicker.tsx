"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Readiness } from "@/lib/types";

export interface Candidate {
  id: string;
  title: string;
  words: number;
  readiness: Readiness | null;
}

interface Settled {
  comparisonId: string;
  pairKey: string;
  winnerTitle: string;
}

export default function ComparePicker({
  candidates,
  settled,
}: {
  candidates: Candidate[];
  settled: Settled[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedReopen, setConfirmedReopen] = useState(false);

  const ready = picked.length === 2;

  const chosen = candidates.filter((c) => picked.includes(c.id));

  // Both drafts still carrying structural problems: comparing them decides
  // between two unfinished essays, which is premature but not forbidden.
  const bothUnfinished =
    ready && chosen.every((c) => c.readiness === "needs_work");

  const alreadySettled = useMemo(() => {
    if (!ready) return null;
    const key = [...picked].sort().join("|");
    return settled.find((s) => s.pairKey === key) ?? null;
  }, [picked, ready, settled]);

  function toggle(id: string) {
    setConfirmedReopen(false);
    setError(null);
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      // Third pick replaces the oldest — a comparison is always exactly two.
      return prev.length < 2 ? [...prev, id] : [prev[1], id];
    });
  }

  async function run() {
    if (!ready || running) return;
    setRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionAId: picked[0], versionBId: picked[1] }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "That didn't go through.");
        setRunning(false);
        return;
      }

      router.push(`/compare/${payload.comparisonId}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setRunning(false);
    }
  }

  return (
    <div className="mt-8">
      <p className="text-xs uppercase tracking-widest text-muted">
        Pick exactly two
      </p>

      <ul className="mt-3 space-y-2">
        {candidates.map((candidate) => {
          const selected = picked.includes(candidate.id);
          return (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => toggle(candidate.id)}
                className={`flex w-full items-center justify-between gap-4 rounded-lg border bg-white p-4 text-left transition ${
                  selected
                    ? "border-accent shadow-sm"
                    : "border-line hover:border-accent/50"
                }`}
              >
                <span>
                  <span className="font-serif text-base">{candidate.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {candidate.words} words
                    {candidate.readiness === "needs_work" &&
                      " · structural work open"}
                    {candidate.readiness === null && " · not read yet"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
                    selected
                      ? "border-accent text-accent"
                      : "border-line text-muted"
                  }`}
                >
                  {selected ? "Selected" : "Select"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {bothUnfinished && (
        <p className="mt-4 rounded-lg border border-flag-medium/40 bg-flag-medium/10 p-3 text-sm">
          Both of these still have structural work open. Comparing two unfinished
          drafts decides between two essays that aren&apos;t done — you&apos;ll
          get a sharper answer after closing the structural spots on each. You
          can go ahead anyway.
        </p>
      )}

      {alreadySettled && !confirmedReopen && (
        <div className="mt-4 rounded-lg border border-flag-high/40 bg-flag-high/10 p-4 text-sm">
          <p className="font-medium text-flag-high">
            You already settled this one.
          </p>
          <p className="mt-1">
            The verdict was <strong>{alreadySettled.winnerTitle}</strong>.
            Re-running the same matchup is how a settled decision turns back into
            an open one.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/compare/${alreadySettled.comparisonId}`}
              className="rounded-full bg-ink px-4 py-2 text-xs text-paper hover:opacity-90"
            >
              See that verdict
            </Link>
            <button
              type="button"
              onClick={() => setConfirmedReopen(true)}
              className="rounded-full border border-line px-4 py-2 text-xs hover:border-flag-high"
            >
              Re-open it anyway
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-flag-high/10 px-3 py-2 text-sm text-flag-high">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={run}
        disabled={!ready || running || Boolean(alreadySettled && !confirmedReopen)}
        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm text-paper transition hover:opacity-90 disabled:opacity-40"
      >
        {running
          ? "Deciding…"
          : ready
            ? "Compare these two"
            : `Pick ${2 - picked.length} more`}
      </button>
    </div>
  );
}
