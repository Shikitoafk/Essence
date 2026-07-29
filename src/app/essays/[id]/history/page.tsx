import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VersionTimeline from "./VersionTimeline";
import { createClient } from "@/lib/supabase/server";
import type { Essay, EssayVersion, FlaggedSpot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
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

  const { data: essay } = await supabase
    .from("essays")
    .select("*")
    .eq("id", id)
    .single<Essay>();

  if (!essay) notFound();

  const [versionsResult, spotsResult] = await Promise.all([
    supabase
      .from("essay_versions")
      .select("*")
      .eq("essay_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("flagged_spots")
      .select("*")
      .eq("essay_id", id)
      .order("queue_position", { ascending: true }),
  ]);

  const versions = (versionsResult.data ?? []) as EssayVersion[];
  const spots = (spotsResult.data ?? []) as FlaggedSpot[];

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? undefined} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href={`/essays/${id}`}
              className="text-sm text-muted hover:text-ink"
            >
              ← {essay.title}
            </Link>
            <h1 className="mt-1 font-serif text-3xl">Revision history</h1>
          </div>
        </div>

        {versions.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-line bg-white p-8 text-sm text-muted">
            No versions yet. Every feedback run saves one automatically, and you
            can save one by hand from the workspace at any time.
          </p>
        ) : (
          <VersionTimeline
            versions={versions}
            spots={spots}
            currentDraft={essay.current_draft ?? ""}
          />
        )}
      </main>
    </div>
  );
}
