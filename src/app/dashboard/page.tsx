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

const READINESS_PILL: Record<Readiness, { label: string; tone: string }> = {
  needs_work: { label: "Needs work", tone: "bg-flag-high/15 text-flag-high" },
  strong: { label: "Strong", tone: "bg-flag-medium/15 text-flag-medium" },
  ready_to_submit: {
    label: "Ready to submit",
    tone: "bg-flag-low/20 text-flag-low",
  },
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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">Your essays</h1>
            <p className="mt-1 text-sm text-muted">
              One document per essay. Drafts, flagged spots and conversations
              stay together across the season.
            </p>
          </div>

          {essays.length >= 2 ? (
            <Link
              href="/compare"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-accent"
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div>
            {essays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
                <p className="font-serif text-lg">Nothing here yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Create your first essay, paste a draft of at least 50 words,
                  and Essence will read it once, properly.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
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
                  const over =
                    essay.word_limit != null && words > essay.word_limit;

                  return (
                    <li key={essay.id}>
                      <Link
                        href={`/essays/${essay.id}`}
                        className="block rounded-lg border border-line bg-white p-5 transition hover:border-accent"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="font-serif text-lg">{essay.title}</h2>
                            <p className="mt-0.5 text-xs uppercase tracking-widest text-muted">
                              {essay.essay_kind === "supplemental"
                                ? "Supplemental"
                                : "Personal statement"}
                              {essay.school ? ` · ${essay.school}` : ""}
                            </p>
                          </div>
                          <span
                            className={`text-sm ${over ? "text-flag-high" : "text-muted"}`}
                          >
                            {words} word{words === 1 ? "" : "s"}
                            {essay.word_limit ? ` / ${essay.word_limit}` : ""}
                          </span>
                        </div>

                        {readiness ? (
                          <div className="mt-4">
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${READINESS_PILL[readiness].tone}`}
                              >
                                {READINESS_PILL[readiness].label}
                              </span>
                              <span className="text-muted">
                                {resolved} of {resolved + open} worked through
                              </span>
                            </div>

                            {resolved + open > 0 && (
                              <div
                                className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line"
                                role="progressbar"
                                aria-valuenow={resolved}
                                aria-valuemin={0}
                                aria-valuemax={resolved + open}
                              >
                                <div
                                  className="h-full rounded-full bg-flag-low transition-all"
                                  style={{
                                    width: `${(resolved / (resolved + open)) * 100}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-muted">Not read yet</p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {archived.length > 0 && <ArchivedList essays={archived} />}
          </div>

          <NewEssayForm />
        </div>
      </main>
    </div>
  );
}
