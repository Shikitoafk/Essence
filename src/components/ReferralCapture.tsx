"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureReferral, trackProductEvent } from "@/lib/productAnalytics";

export default function ReferralCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const referrer = params.get("ref");
    if (!referrer || !captureReferral(referrer)) return;

    const seenKey = `essence_referral_landed:${referrer}`;
    if (window.sessionStorage.getItem(seenKey)) return;
    window.sessionStorage.setItem(seenKey, "1");
    trackProductEvent("referral_landed");
  }, [params]);

  return null;
}
