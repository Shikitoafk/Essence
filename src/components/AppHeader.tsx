import Link from "next/link";
import Logo from "@/components/Logo";
import { signOut } from "@/app/actions";

export default function AppHeader({ email }: { email?: string }) {
  return (
    <header className="border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[68rem] items-center justify-between px-6 py-4">
        <Link href="/dashboard" aria-label="Essence — your essays">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {email && <span className="hidden text-muted sm:inline">{email}</span>}
          <Link href="/settings" className="rounded-full px-2.5 py-1.5 text-muted transition hover:bg-accent-soft hover:text-ink">
            Privacy &amp; data
          </Link>
          <form action={signOut}>
            <button type="submit" className="rounded-full px-2.5 py-1.5 text-muted transition hover:bg-accent-soft hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
