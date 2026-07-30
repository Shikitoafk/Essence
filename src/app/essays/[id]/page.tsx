import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Workspace from "@/components/workspace/Workspace";
import { createClient } from "@/lib/supabase/server";
import { dataPolicy } from "@/lib/ai/llm";
import type {
  ConversationMessage,
  Essay,
  EssayReport,
  FlaggedSpot,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EssayPage({
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

  const [spotsResult, messagesResult, reportResult] = await Promise.all([
    supabase
      .from("flagged_spots")
      .select("*")
      .eq("essay_id", id)
      .order("queue_position", { ascending: true }),
    supabase
      .from("conversation_messages")
      .select("*")
      .eq("essay_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("essay_reports")
      .select("*")
      .eq("essay_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<EssayReport>(),
  ]);

  const report = reportResult.data ?? null;
  const allSpots = (spotsResult.data ?? []) as FlaggedSpot[];

  /*
   * Only the latest run's spots belong in the workspace. Earlier runs describe
   * drafts that no longer exist, and showing them stacks near-identical cards
   * on every re-read. They stay in the database — the history page counts them
   * per version, and deleting them would cascade away the student's
   * conversation — they just aren't the current worklist.
   *
   * Anything the student resolved or set aside is carried onto the new run's
   * cards by /api/feedback, so scoping here never loses settled work.
   */
  const currentSpots = report?.version_id
    ? allSpots.filter((spot) => spot.version_id === report.version_id)
    : allSpots;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={user.email ?? undefined} />
      <Workspace
        essay={essay}
        initialSpots={currentSpots}
        initialMessages={(messagesResult.data ?? []) as ConversationMessage[]}
        report={report}
        paidTier={dataPolicy().safeForPersonalContent}
      />
    </div>
  );
}
