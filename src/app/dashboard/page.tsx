import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import NewEssayForm from "./NewEssayForm";
import { createClient } from "@/lib/supabase/server";
import { countWords, type Essay } from "@/lib/types";

export const dynamic = "force-dynamic";

interface EssayRow extends Essay {
  flagged_spots: { status: string }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("essays")
    .select("*, flagged_spots(status)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const essays = (data ?? []) as EssayRow[];

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
                  const open = essay.flagged_spots.filter(
                    (s) => s.status === "open",
                  ).length;
                  const resolved = essay.flagged_spots.filter(
                    (s) => s.status === "resolved",
                  ).length;
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

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                          {essay.last_feedback_at ? (
                            <>
                              <span className="text-flag-high">
                                {open} open
                              </span>
                              <span className="text-flag-low">
                                {resolved} resolved
                              </span>
                            </>
                          ) : (
                            <span className="text-muted">Not read yet</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <NewEssayForm />
        </div>
      </main>
    </div>
  );
}
