"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackProductEvent } from "@/lib/productAnalytics";

type Props = ComponentProps<typeof Link> & {
  source: string;
};

export default function TrackedAuthLink({ source, onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackProductEvent("auth_started", { source, method: "landing_link" });
        onClick?.(event);
      }}
    />
  );
}
