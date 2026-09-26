import Link from "next/link";
import Logo from "@/components/Logo";
import NavigationLink from "@/components/NavigationLink";
import { signOut } from "@/app/actions";

export default function AppHeader({ email }: { email?: string }) {
  return (
    <header className="app-header border-b border-white/8 bg-[#0d1012]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between px-5 py-3.5 sm:px-7">
        <NavigationLink href="/dashboard" aria-label="Essence — your essays">
          <Logo size="sm" tone="inverse" />
        </NavigationLink>
        <div className="flex items-center gap-1 text-sm">
          {email && <span className="mr-3 hidden text-white/38 lg:inline">{email}</span>}
          <Link href="/settings" className="rounded-full px-3 py-2 text-white/58 transition hover:bg-white/8 hover:text-white">
            Privacy &amp; data
          </Link>
          <form action={signOut}>
            <button type="submit" className="rounded-full px-3 py-2 text-white/58 transition hover:bg-white/8 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
