import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import FactsManager from "./FactsManager";
import { createClient } from "@/lib/supabase/server";
import { modelChain } from "@/lib/ai/gemini";
import type { EssayFact } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: facts }, { count: essayCount }] = await Promise.all([
    supabase
      .from("essay_facts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("essays")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? undefined} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-3xl">Privacy &amp; your data</h1>
        <p className="mt-2 text-sm text-muted">
          Plain version: your essays live in this app&apos;s own Supabase
          database. The only place text leaves it is the Gemini API call that
          produces your feedback.
        </p>

        <section className="mt-8 rounded-lg border border-line bg-white p-6">
          <h2 className="font-serif text-lg">What gets stored</h2>
          <dl className="mt-4 space-y-4 text-sm">
            {[
              [
                "Your drafts",
                "The current text of each essay, plus every version you save. Kept until you delete the essay.",
              ],
              [
                "Flagged spots",
                "The quoted line, the gap Essence identified, and whether you've resolved it, set it aside, or left it open.",
              ],
              [
                "Your conversations",
                "The full follow-up thread per essay, so a later session can pick up where you left off instead of re-asking.",
              ],
              [
                "Facts you share",
                "Short notes about people, places and projects you mention, so questions build on what Essence already knows. You can read and delete every one of them below.",
              ],
              [
                "Usage counts",
                "A timestamp per AI call, used only to keep everyone inside the free API quota.",
              ],
            ].map(([term, body]) => (
              <div key={term}>
                <dt className="font-medium">{term}</dt>
                <dd className="mt-0.5 text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 rounded-lg border border-line bg-white p-6">
          <h2 className="font-serif text-lg">Who else sees it</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>
              <span className="text-ink">Supabase</span> — hosts the database.
              Row-level security means your rows are readable only by your own
              signed-in session; no other user of this app can query them.
            </li>
            <li>
              <span className="text-ink">Google (Gemini API)</span> — receives
              your draft text and conversation turns in order to generate
              feedback. Nothing else is sent, and no other third party receives
              your essays. Models in use:{" "}
              <code className="text-xs">
                {modelChain("diagnostic")[0]}
              </code>{" "}
              for the full read,{" "}
              <code className="text-xs">
                {modelChain("conversation")[0]}
              </code>{" "}
              for follow-up turns.
            </li>
            <li>
              <span className="text-ink">Vercel Analytics</span> — counts page
              views so we know which pages get used. It records the page
              address, and never any part of your essay, your answers, or who
              you are. It sets no cookies and does not follow you to other
              sites.
            </li>
            <li>
              There is no advertising, no ad tracking, and no other
              data-sharing integration in this app.
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted">
            If you tell Essence that something is private, it is not written to
            the facts store and is not carried into later sessions.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-line bg-white p-6">
          <h2 className="font-serif text-lg">What Essence remembers about you</h2>
          <p className="mt-1 text-sm text-muted">
            {essayCount ?? 0} essay{essayCount === 1 ? "" : "s"} ·{" "}
            {(facts ?? []).length} remembered fact
            {(facts ?? []).length === 1 ? "" : "s"}
          </p>
          <FactsManager facts={(facts ?? []) as EssayFact[]} />
        </section>

        <section className="mt-6 rounded-lg border border-line bg-white p-6">
          <h2 className="font-serif text-lg">Deleting things</h2>
          <p className="mt-2 text-sm text-muted">
            Deleting an essay removes its drafts, versions, flagged spots and
            conversation along with it. To delete your account entirely, contact
            whoever runs this instance — account deletion is handled in the
            Supabase dashboard.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-accent underline underline-offset-2"
          >
            Back to your essays
          </Link>
        </section>
      </main>
    </div>
  );
}
