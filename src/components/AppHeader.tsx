import Link from "next/link";
import { signOut } from "@/app/actions";

export default function AppHeader({ email }: { email?: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-serif text-lg tracking-tight">
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
