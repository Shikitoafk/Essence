import Link from "next/link";

export default function EssayNotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="font-serif text-2xl">That essay isn&apos;t here.</h1>
      <p className="mt-2 text-sm text-muted">
        It may have been deleted, or it belongs to a different account.
      </p>
      <Link
        href="/dashboard"
        className="mx-auto mt-6 rounded-full bg-ink px-5 py-2.5 text-sm text-paper"
      >
        Back to your essays
      </Link>
    </div>
  );
}
