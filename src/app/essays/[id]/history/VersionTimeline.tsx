"use client";

import { useMemo, useState } from "react";
import { diffWords } from "diff";
import type { EssayVersion, FlaggedSpot } from "@/lib/types";

interface Props {
  versions: EssayVersion[];
  spots: FlaggedSpot[];
  currentDraft: string;
}

const CURRENT = "__current__";

export default function VersionTimeline({
  versions,
  spots,
  currentDraft,
}: Props) {
  // Default to comparing the newest saved version against the live draft.
  const [leftId, setLeftId] = useState(versions[0]?.id ?? CURRENT);
  const [rightId, setRightId] = useState(CURRENT);

  const textFor = (id: string) =>
    id === CURRENT
      ? currentDraft
      : (versions.find((v) => v.id === id)?.draft_text ?? "");

  const parts = useMemo(
    () => diffWords(textFor(leftId), textFor(rightId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leftId, rightId, versions, currentDraft],
  );

  const changed = parts.filter((p) => p.added || p.removed).length;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <ol className="space-y-3">
        {versions.map((version) => {
          const versionSpots = spots.filter(
            (s) => s.version_id === version.id,
          );
          const open = versionSpots.filter((s) => s.status === "open").length;
          const resolved = versionSpots.filter(
            (s) => s.status === "resolved",
          ).length;
          const skipped = versionSpots.filter(
            (s) => s.status === "skipped",
          ).length;

          return (
            <li
              key={version.id}
              className="rounded-lg border border-line bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {version.label ?? "Saved draft"}
                </span>
                <span className="text-xs text-muted">
                  {version.word_count} words
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {new Date(version.created_at).toLocaleString()}
              </p>

              {versionSpots.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="text-flag-low">{resolved} resolved</span>
                  <span className="text-flag-high">{open} open</span>
                  {skipped > 0 && (
                    <span className="text-muted">{skipped} set aside</span>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLeftId(version.id)}
                  className={`rounded-full border px-2.5 py-1 ${
                    leftId === version.id
                      ? "border-accent text-accent"
                      : "border-line hover:border-accent/60"
                  }`}
                >
                  Compare from
                </button>
                <button
                  type="button"
                  onClick={() => setRightId(version.id)}
                  className={`rounded-full border px-2.5 py-1 ${
                    rightId === version.id
                      ? "border-accent text-accent"
                      : "border-line hover:border-accent/60"
                  }`}
                >
                  to
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="text-sm">
            <span className="text-muted">Comparing</span>{" "}
            <strong>{labelFor(leftId, versions)}</strong>{" "}
            <span className="text-muted">→</span>{" "}
            <strong>{labelFor(rightId, versions)}</strong>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{changed} changed passages</span>
            <button
              type="button"
              onClick={() => setRightId(CURRENT)}
              className="rounded-full border border-line px-2.5 py-1 hover:border-accent"
            >
              Compare to current draft
            </button>
          </div>
        </div>

        <div className="draft-shared-metrics max-h-[36rem] overflow-y-auto">
          {parts.map((part, i) =>
            part.added ? (
              <span
                key={i}
                className="rounded-sm bg-flag-low/20 decoration-flag-low"
              >
                {part.value}
              </span>
            ) : part.removed ? (
              <span
                key={i}
                className="rounded-sm bg-flag-high/15 line-through decoration-flag-high/60"
              >
                {part.value}
              </span>
            ) : (
              <span key={i} className="text-muted">
                {part.value}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function labelFor(id: string, versions: EssayVersion[]): string {
  if (id === CURRENT) return "current draft";
  const version = versions.find((v) => v.id === id);
  if (!version) return "—";
  return `${version.label ?? "saved draft"} · ${new Date(
    version.created_at,
  ).toLocaleDateString()}`;
}
