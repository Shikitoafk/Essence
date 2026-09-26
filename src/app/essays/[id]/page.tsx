import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Workspace from "@/components/workspace/Workspace";
import { createClient } from "@/lib/supabase/server";
import { dataPolicy } from "@/lib/ai/llm";
import { selectCurrentSpots } from "@/lib/currentSpots";
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

  // All four reads depend on the ID, not on the essay query completing first.
  const [essayResult, spotsResult, messagesResult, reportResult] = await Promise.all([
    supabase
      .from("essays")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle<Essay>(),
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

  if (essayResult.error) throw new Error("Could not load this essay. Please try again.");
  const essay = essayResult.data;
  if (!essay) notFound();
  if (spotsResult.error || messagesResult.error || reportResult.error) {
    throw new Error("Could not load this essay's feedback. Please try again.");
  }

  const report = reportResult.data ?? null;
  const allSpots = (spotsResult.data ?? []) as FlaggedSpot[];
  let feedbackDraft: string | null = null;

  // A report describes an exact snapshot, not whatever happens to be in the
  // editor today. Loading that snapshot lets the workspace retire stale
  // verdicts instead of presenting them as a judgement of revised text.
  if (report?.version_id) {
    const { data: readVersion } = await supabase
      .from("essay_versions")
      .select("draft_text")
      .eq("id", report.version_id)
      .eq("essay_id", essay.id)
      .maybeSingle<{ draft_text: string }>();
    feedbackDraft = readVersion?.draft_text ?? null;
  }

  // Older runs stay in the database — the history page counts them per version,
  // and deleting them would cascade away the student's conversation.
  const currentSpots = selectCurrentSpots(allSpots);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={user.email ?? undefined} />
      <Workspace
        // A new read replaces the complete feedback session. Remounting on the
        // report id gives the client authoritative spots/messages without
        // copying server props into local state from effects.
        key={`${essay.id}:${report?.id ?? "unread"}`}
        essay={essay}
        initialSpots={currentSpots}
        initialMessages={(messagesResult.data ?? []) as ConversationMessage[]}
        report={report}
        feedbackDraft={feedbackDraft}
        paidTier={dataPolicy().safeForPersonalContent}
      />
    </div>
  );
}
