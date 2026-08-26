import Link from "next/link";
import { Suspense } from "react";
import Logo, { LogoMark } from "@/components/Logo";
import { supabaseConfigured } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  const configured = supabaseConfigured();

  return (
    <div className="login-shell min-h-screen px-5 py-6 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_28px_70px_-48px_rgba(23,32,51,0.48)] md:grid-cols-[0.9fr_1.1fr]">
          <aside className="hidden bg-ink p-10 text-white md:flex md:flex-col md:justify-between">
            <Link href="/" aria-label="Essence — home" className="inline-flex items-center gap-3"><LogoMark className="h-9 w-9" /><span className="font-display text-xl font-medium tracking-[-0.04em] text-white">Essence</span></Link>
            <div><p className="font-display text-4xl font-medium leading-[1.02] tracking-[-0.05em]">The writer stays in the work.</p><p className="mt-5 max-w-xs text-sm leading-7 text-white/60">Essence keeps every draft, question, and breakthrough in one quiet workspace.</p></div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/40">Better questions · Still your voice</p>
          </aside>
          <div className="p-7 sm:p-10">
            <Link href="/" aria-label="Essence — home" className="md:hidden"><Logo size="md" /></Link>
            <p className="section-eyebrow mt-8 md:mt-0">Your workspace</p>
            <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.05em] text-ink">Your essays, your words.</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Sign in to keep drafts, flagged spots and conversations in one place across the season.</p>

      {configured ? (
        <Suspense
          fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}
        >
          <LoginForm />
        </Suspense>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-accent-soft/40 p-5 text-sm">
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
        </div>
      </div>
    </div>
  );
}
