import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Workspace from "@/components/workspace/Workspace";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={user.email ?? undefined} />
      <Workspace
        essay={essay}
        initialSpots={(spotsResult.data ?? []) as FlaggedSpot[]}
        initialMessages={(messagesResult.data ?? []) as ConversationMessage[]}
        report={reportResult.data ?? null}
      />
    </div>
  );
}
