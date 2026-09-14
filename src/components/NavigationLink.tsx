"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function PendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span role="status">
      <span className="sr-only">Opening page…</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-accent motion-safe:animate-pulse"
      />
    </span>
  );
}

/** Acknowledges the click while the next route waits for authentication/data. */
export default function NavigationLink({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={`relative ${className}`}>
      {children}
      <PendingIndicator />
    </Link>
  );
}
