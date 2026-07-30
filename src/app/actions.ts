"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countWords, type EssayKind, type SpotStatus } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createEssay(formData: FormData) {
  const { supabase, user } = await requireUser();

  const title = String(formData.get("title") ?? "").trim() || "Untitled essay";
  const kind = (String(formData.get("essay_kind") ?? "personal_statement") ===
  "supplemental"
    ? "supplemental"
    : "personal_statement") as EssayKind;
  const school = String(formData.get("school") ?? "").trim() || null;
  const promptText = String(formData.get("prompt_text") ?? "").trim() || null;
  const rawLimit = String(formData.get("word_limit") ?? "").trim();
  const wordLimit = rawLimit ? Number(rawLimit) : null;

  const { data, error } = await supabase
    .from("essays")
    .insert({
      user_id: user.id,
      title,
      essay_kind: kind,
      school,
      prompt_text: promptText,
      word_limit:
        wordLimit && Number.isFinite(wordLimit) && wordLimit > 0
          ? Math.round(wordLimit)
          : null,
      current_draft: "",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create that essay.");
  }

  revalidatePath("/dashboard");
  redirect(`/essays/${data.id}`);
}

export async function deleteEssay(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("essayId") ?? "");
  if (!id) return;

  await supabase.from("essays").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export interface EssaySettingsPatch {
  title?: string;
  prompt_text?: string | null;
  word_limit?: number | null;
  essay_kind?: EssayKind;
  school?: string | null;
}

export async function updateEssaySettings(
  essayId: string,
  patch: EssaySettingsPatch,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("essays")
    .update(patch)
    .eq("id", essayId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/essays/${essayId}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/** Autosave from the editor. Deliberately does not create a version. */
export async function saveDraft(essayId: string, draft: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("essays")
    .update({ current_draft: draft })
    .eq("id", essayId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, savedAt: new Date().toISOString() };
}

/** An explicit, named snapshot for the revision timeline. */
export async function saveVersion(essayId: string, label?: string) {
  const { supabase } = await requireUser();

  const { data: essay } = await supabase
    .from("essays")
    .select("current_draft")
    .eq("id", essayId)
    .single<{ current_draft: string }>();

  const draft = essay?.current_draft ?? "";
  if (!draft.trim()) {
    return { ok: false as const, error: "There's nothing in the draft to save." };
  }

  const { error } = await supabase.from("essay_versions").insert({
    essay_id: essayId,
    draft_text: draft,
    word_count: countWords(draft),
    label: label?.trim() || "Manual save",
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/essays/${essayId}/history`);
  return { ok: true as const };
}

/**
 * Puts the next queued question into the conversation — only ever called from
 * an explicit click. Nothing posts a question on the student's behalf: they
 * decide when to take the next one on.
 *
 * Returns the spot the question belongs to so the workspace can bind the input
 * and highlight the right line.
 */
export async function askNextQuestion(essayId: string, spotId: string) {
  const { supabase } = await requireUser();

  /*
   * The caller names the spot. Re-deriving "the next open spot" here looked
   * equivalent but wasn't: the workspace shows only the newest run's spots,
   * while this query saw every open spot on the essay, so an older run's
   * leftover could win on queue_position. The question then belonged to a spot
   * the workspace wasn't showing — it dropped straight into the history and the
   * input never unlocked.
   */
  const { data: next } = await supabase
    .from("flagged_spots")
    .select("id, question, pattern_name")
    .eq("id", spotId)
    .eq("essay_id", essayId)
    .eq("status", "open")
    .maybeSingle<{ id: string; question: string; pattern_name: string }>();

  if (!next) return { ok: false as const, error: "That question is no longer open." };

  // Asking twice for the same spot would double-post it — if its question is
  // already in the thread, just hand back the spot.
  const { data: existing } = await supabase
    .from("conversation_messages")
    .select("id")
    .eq("flagged_spot_id", next.id)
    .eq("role", "assistant")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!existing) {
    const { error } = await supabase.from("conversation_messages").insert({
      essay_id: essayId,
      flagged_spot_id: next.id,
      role: "assistant",
      content: next.question,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    spotId: next.id,
    question: next.question,
    patternName: next.pattern_name,
  };
}

export async function setSpotStatus(spotId: string, status: SpotStatus) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("flagged_spots")
    .update({ status })
    .eq("id", spotId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Season memory is the student's own data — they can wipe it. */
export async function forgetAllFacts() {
  const { supabase, user } = await requireUser();
  await supabase.from("essay_facts").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function forgetFact(factId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("essay_facts")
    .delete()
    .eq("id", factId)
    .eq("user_id", user.id);
  revalidatePath("/settings");
  return { ok: true as const };
}
