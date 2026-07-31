import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ComparePicker, { type Candidate } from "./ComparePicker";
import { createClient } from "@/lib/supabase/server";
import { selectCurrentSpots } from "@/lib/currentSpots";
import {
  countWords,
  deriveReadiness,
  type Essay,
  type EssayComparison,
  type FlaggedSpot,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface EssayRow extends Essay {
  flagged_spots: FlaggedSpot[];
}

export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: essayRows }, { data: settledRows }] = await Promise.all([
    supabase
      .from("essays")
      .select("*, flagged_spots(*)")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
    // Only accepted verdicts count as settled — an unaccepted run is just a
    // second opinion the student never acted on.
    supabase
      .from("essay_comparisons")
      .select("id, version_a_id, version_b_id, winner_id, accepted_at")
      .eq("user_id", user.id)
      .not("accepted_at", "is", null),
  ]);

  const essays = (essayRows ?? []) as EssayRow[];

  const candidates: Candidate[] = essays.map((essay) => {
    const current = selectCurrentSpots(essay.flagged_spots ?? []);
    return {
      id: essay.id,
      title: essay.title,
      words: countWords(essay.current_draft ?? ""),
      readiness: essay.last_feedback_at ? deriveReadiness(current) : null,
    };
  });

  const settled = (settledRows ?? []).map((row) => ({
    id: row.id as string,
    pair: [row.version_a_id as string, row.version_b_id as string].sort(),
    winnerId: row.winner_id as string,
  })) as { id: string; pair: string[]; winnerId: string }[];

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? undefined} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          ← Your essays
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Compare two versions</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          For when you have two genuinely different takes on the same essay and
          can&apos;t decide. Essence picks one — it won&apos;t tell you
          they&apos;re both good in their own way, because that&apos;s what keeps
          you stuck.
        </p>

        {candidates.length < 2 ? (
          <p className="mt-8 rounded-lg border border-dashed border-line bg-white p-8 text-sm text-muted">
            You need two essays to compare. Create a second version of the one
            you&apos;re working on — a different opening, or the same story
            without its metaphor — and come back.
          </p>
        ) : (
          <ComparePicker
            candidates={candidates}
            settled={settled.map((s) => ({
              comparisonId: s.id,
              pairKey: s.pair.join("|"),
              winnerTitle:
                candidates.find((c) => c.id === s.winnerId)?.title ??
                "the winner",
            }))}
          />
        )}
      </main>
    </div>
  );
}

export type { EssayComparison };
