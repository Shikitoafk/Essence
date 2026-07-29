import Link from "next/link";
import { Suspense } from "react";
import { supabaseConfigured } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const configured = supabaseConfigured();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="font-serif text-xl tracking-tight">
        Essence
      </Link>
      <h1 className="mt-8 font-serif text-3xl">Your essays, your words.</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to keep your drafts, flagged spots and conversations in one
        place across the season.
      </p>

      {configured ? (
        <Suspense
          fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}
        >
          <LoginForm />
        </Suspense>
      ) : (
        <div className="mt-8 rounded-lg border border-line bg-white p-5 text-sm">
          <p className="font-medium">Supabase isn&apos;t connected yet.</p>
          <p className="mt-2 text-muted">
            Set <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code className="text-xs">.env.local</code>, then run the SQL in{" "}
            <code className="text-xs">supabase/schema.sql</code>. See the README
            for the five-minute version.
          </p>
        </div>
      )}
    </div>
  );
}
