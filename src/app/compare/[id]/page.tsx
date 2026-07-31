import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ComparisonResult from "./ComparisonResult";
import { createClient } from "@/lib/supabase/server";
import type { Essay, EssayComparison } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comparison } = await supabase
    .from("essay_comparisons")
    .select("*")
    .eq("id", id)
    .maybeSingle<EssayComparison>();

  if (!comparison) notFound();

  const { data: essayRows } = await supabase
    .from("essays")
    .select("*")
    .in("id", [comparison.version_a_id, comparison.version_b_id]);

  const essays = (essayRows ?? []) as Essay[];
  const winner = essays.find((e) => e.id === comparison.winner_id);
  const loser = essays.find((e) => e.id !== comparison.winner_id);

  if (!winner || !loser) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? undefined} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          ← Your essays
        </Link>
        <ComparisonResult
          comparison={comparison}
          winner={winner}
          loser={loser}
        />
      </main>
    </div>
  );
}
