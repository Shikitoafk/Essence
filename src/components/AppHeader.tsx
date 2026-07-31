import Link from "next/link";
import { signOut } from "@/app/actions";

export default function AppHeader({ email }: { email?: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Carried more weight than the nav beside it, so the product reads as
            the product rather than as one more link. */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-serif text-xl tracking-tight"
        >
          <span
            aria-hidden="true"
            className="h-4 w-1 rounded-full bg-accent"
          />
          Essence
        </Link>
        <div className="flex items-center gap-5 text-sm">
          {email && <span className="hidden text-muted sm:inline">{email}</span>}
          <Link href="/settings" className="text-muted hover:text-ink">
            Privacy &amp; data
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
