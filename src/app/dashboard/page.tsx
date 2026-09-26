import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import NavigationLink from "@/components/NavigationLink";
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

const READINESS: Record<Readiness, { label: string; tone: string; dot: string }> = {
  needs_work: { label: "Needs a decision", tone: "text-flag-high", dot: "bg-flag-high" },
  strong: { label: "Strong draft", tone: "text-flag-medium", dot: "bg-flag-medium" },
  ready_to_submit: { label: "Ready to submit", tone: "text-flag-low", dot: "bg-flag-low" },
};

interface EssayRow extends Pick<Essay,
  "id" | "title" | "essay_kind" | "school" | "word_limit" | "current_draft" |
  "last_feedback_at" | "archived_at" | "archived_reason" | "updated_at"
> {
  flagged_spots: Pick<FlaggedSpot, "version_id" | "created_at" | "status" | "impact">[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("essays")
    .select("id, title, essay_kind, school, word_limit, current_draft, last_feedback_at, archived_at, archived_reason, updated_at, flagged_spots(version_id, created_at, status, impact)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Could not load your essays. Please try again.");

  const all = (data ?? []) as EssayRow[];
  const essays = all.filter((essay) => !essay.archived_at);
  const archived = all.filter((essay) => essay.archived_at);
  const summaries = essays.map((essay) => {
    const spots = selectCurrentSpots(essay.flagged_spots);
    return { essay, spots, readiness: essay.last_feedback_at ? deriveReadiness(spots) : null };
  });
  const ready = summaries.filter((item) => item.readiness === "ready_to_submit").length;
  const open = summaries.reduce(
    (total, item) => total + item.spots.filter((spot) => spot.status === "open" || spot.status === "answered").length,
    0,
  );

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? undefined} />

      <section className="dashboard-hero">
        <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10 lg:py-20">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-mark">Your application season</p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-medium leading-[0.96] tracking-[-0.065em] text-white sm:text-7xl">Every draft. One clear place to think.</h1>
            <p className="mt-5 max-w-xl leading-7 text-white/48">Draft, read, answer, revise. Essence keeps the reasoning behind every version so you can move forward without losing what already works.</p>
          </div>
          <div className="grid grid-cols-3 gap-7 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {[
              [String(essays.length).padStart(2, "0"), "Active"],
              [String(open).padStart(2, "0"), "Open spots"],
              [String(ready).padStart(2, "0"), "At rest"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-display text-3xl font-medium tracking-[-0.05em] text-white">{value}</p>
                <p className="mt-1 text-xs text-white/38">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[90rem] px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-eyebrow">Active work</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-[-0.045em] text-ink">Your essays</h2>
          </div>
          {essays.length >= 2 ? (
            <Link href="/compare" className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent">
              Compare two drafts <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <span title="Create two essays before comparing them." className="cursor-not-allowed rounded-full border border-line px-4 py-2.5 text-sm text-muted opacity-55">Compare two drafts</span>
          )}
        </div>

        <div className="mt-7"><NewEssayForm /></div>

        {summaries.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-ink/15 bg-white/70 p-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-xl text-accent">+</span>
            <p className="mt-5 font-display text-3xl font-medium tracking-[-0.045em]">Begin with the draft you keep avoiding.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Create a workspace, paste at least 50 words, and Essence will read the whole piece before it asks you to change a line.</p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map(({ essay, spots, readiness }) => {
              const openSpots = spots.filter((spot) => spot.status === "open" || spot.status === "answered").length;
              const resolved = spots.filter((spot) => spot.status === "resolved").length;
              const total = openSpots + resolved;
              const words = countWords(essay.current_draft ?? "");
              const status = readiness ? READINESS[readiness] : null;
              const kind = essay.essay_kind === "supplemental"
                ? `Supplemental${essay.school ? ` · ${essay.school}` : ""}`
                : "Personal statement";

              return (
                <li key={essay.id} className="essay-index-card">
                  <NavigationLink href={`/essays/${essay.id}`} className="group flex min-h-[18rem] flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-mono text-[0.58rem] uppercase tracking-[0.17em] text-muted">{kind}</p>
                      <span className="text-xs text-muted">Edited {formatWhen(essay.updated_at)}</span>
                    </div>
                    <h3 className="mt-8 max-w-[17rem] font-display text-3xl font-medium leading-[1.02] tracking-[-0.05em] text-ink transition group-hover:text-accent">{essay.title}</h3>
                    <div className="mt-auto pt-10">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          {status ? (
                            <p className={`inline-flex items-center gap-2 text-sm font-medium ${status.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</p>
                          ) : (
                            <p className="text-sm text-muted">Ready for its first read</p>
                          )}
                          <p className={`mt-1.5 text-xs ${wordCountTone(words, essay.word_limit)}`}>{words}{essay.word_limit ? ` / ${essay.word_limit}` : ""} words</p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-lg text-ink transition group-hover:border-accent group-hover:bg-accent group-hover:text-white">↗</span>
                      </div>
                      {total > 0 && (
                        <div className="mt-5 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={resolved} aria-valuemin={0} aria-valuemax={total}>
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(resolved / total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </NavigationLink>
                </li>
              );
            })}
          </ul>
        )}

        {archived.length > 0 && (
          <div className="mt-10"><ArchivedList essays={archived.map(({ id, title, archived_reason }) => ({ id, title, archived_reason }))} /></div>
        )}
      </main>
    </div>
  );
}
