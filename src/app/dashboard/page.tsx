import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import NewEssayForm from "./NewEssayForm";
import ArchivedList from "./ArchivedList";
import { createClient } from "@/lib/supabase/server";
import {
  countWords,
  deriveReadiness,
  type Essay,
  type FlaggedSpot,
  type Readiness,
} from "@/lib/types";
import { selectCurrentSpots } from "@/lib/currentSpots";

export const dynamic = "force-dynamic";

/**
 * Word count as a signal rather than a fact: comfortably under reads neutral,
 * close to the ceiling warns, over is a problem to fix before submitting.
 */
function wordCountTone(words: number, limit: number | null): string {
  if (!limit) return "text-muted";
  if (words > limit) return "font-medium text-flag-high";
  if (words >= limit * 0.95) return "text-flag-medium";
  return "text-muted";
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

const READINESS_PILL: Record<Readiness, { label: string; tone: string }> = {
  needs_work: { label: "Needs work", tone: "bg-flag-high/15 text-flag-high" },
  strong: { label: "Strong", tone: "bg-flag-medium/15 text-flag-medium" },
  ready_to_submit: {
    label: "Ready to submit",
    tone: "bg-flag-low/20 text-flag-low",
  },
};

/** The same three states as ink rather than as a pill — a mark in the margin
 *  of an index, not a badge. */
const READINESS_TONE: Record<Readiness, string> = {
  needs_work: "text-flag-high",
  strong: "text-flag-medium",
  ready_to_submit: "text-flag-low",
};

interface EssayRow extends Essay {
  flagged_spots: FlaggedSpot[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("essays")
    .select("*, flagged_spots(*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const all = (data ?? []) as EssayRow[];
  // Archived versions stay readable but leave the main list: two equally
  // visible versions of one essay is what keeps students flip-flopping.
  const essays = all.filter((e) => !e.archived_at);
  const archived = all.filter((e) => e.archived_at);

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? undefined} />

      <main className="mx-auto max-w-[68rem] px-6 py-10 sm:py-14">
        <div className="dashboard-intro flex flex-wrap items-end justify-between gap-4 rounded-[1.75rem] border border-line bg-white px-6 py-7 sm:px-8 sm:py-9">
          <div>
            <p className="section-eyebrow">Your writing season</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-ink sm:text-5xl">Your essays</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
              One document per essay. Drafts, flagged spots and conversations
              stay together across the season.
            </p>
          </div>

          {essays.length >= 2 ? (
            <Link
              href="/compare"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm transition hover:border-accent hover:bg-accent-soft/30"
            >
              Compare versions
            </Link>
          ) : (
            <span
              title="You need two essays before there's anything to compare."
              className="cursor-not-allowed rounded-full border border-line px-4 py-2 text-sm text-muted opacity-60"
            >
              Compare versions
            </span>
          )}
        </div>

        <div className="mt-8">
          <div className="mb-4">
            <NewEssayForm />
          </div>

          <div>
            {essays.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-line bg-white p-10 text-center">
                <p className="font-display text-2xl font-medium tracking-[-0.04em]">Nothing here yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Create your first essay, paste a draft of at least 50 words,
                  and Essence will read it once, properly.
                </p>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-[1.5rem] border border-line bg-white">
                {essays.map((essay) => {
                  // Only the newest run counts. Leftovers from earlier runs
                  // describe drafts that no longer exist, and counting them
                  // inflates "open" into a number the workspace never shows.
                  const current = selectCurrentSpots(essay.flagged_spots);
                  const open = current.filter(
                    (s) => s.status === "open" || s.status === "answered",
                  ).length;
                  const resolved = current.filter(
                    (s) => s.status === "resolved",
                  ).length;
                  const readiness = essay.last_feedback_at
                    ? deriveReadiness(current)
                    : null;
                  const words = countWords(essay.current_draft ?? "");
                  const wordTone = wordCountTone(words, essay.word_limit);

                  /*
                   * The type label repeated what the title already said on most
                   * cards ("Personal Statement — Common App" tagged "Personal
                   * statement"). Shown only when it adds something; otherwise
                   * the space goes to when the essay was last touched.
                   */
                  const kindLabel =
                    essay.essay_kind === "supplemental"
                      ? `Supplemental${essay.school ? ` · ${essay.school}` : ""}`
                      : "Personal statement";
                  const kindIsRedundant = essay.title
                    .toLowerCase()
                    .includes(
                      essay.essay_kind === "supplemental"
                        ? "supplement"
                        : "personal statement",
                    );

                  return (
                    <li key={essay.id} className="border-b border-line last:border-b-0">
                      <Link
                        href={`/essays/${essay.id}`}
                        className="group flex flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-5 transition-colors hover:bg-accent-soft/30 sm:px-6"
                      >
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-xl font-medium tracking-[-0.035em] text-ink transition-colors group-hover:text-accent">
                            {essay.title}
                          </h2>
                          <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                            {kindIsRedundant
                              ? `Edited ${formatWhen(essay.updated_at)}`
                              : kindLabel}
                          </p>
                        </div>

                        {/* The season's status, kept to the right where a
                            reader's eye already goes for a page number. */}
                        <div className="shrink-0 text-right">
                          {readiness ? (
                            <>
                              <span
                                className={`font-mono text-[0.62rem] uppercase tracking-[0.16em] ${READINESS_TONE[readiness]}`}
                              >
                                {READINESS_PILL[readiness].label}
                              </span>
                              <p className="mt-1 text-xs text-muted">
                                {resolved} of {resolved + open} worked through
                              </p>
                            </>
                          ) : (
                            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                              Not read yet
                            </span>
                          )}
                          <p className={`mt-1 text-xs ${wordTone}`}>
                            {words}
                            {essay.word_limit
                              ? ` / ${essay.word_limit}`
                              : ""}{" "}
                            words
                          </p>
                        </div>

                        {/* A hairline the width of the work already done. Full
                            width would read as a container; this is a measure. */}
                        {readiness && resolved + open > 0 && (
                          <div
                            className="h-px w-full bg-line"
                            role="progressbar"
                            aria-valuenow={resolved}
                            aria-valuemin={0}
                            aria-valuemax={resolved + open}
                          >
                            <div
                              className="h-px bg-flag-low transition-all"
                              style={{
                                width: `${(resolved / (resolved + open)) * 100}%`,
                              }}
                            />
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {archived.length > 0 && <ArchivedList essays={archived} />}
          </div>
        </div>
      </main>
    </div>
  );
}
