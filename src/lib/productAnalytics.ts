"use client";

import type {
  ProductEventName,
  ProductEventProperties,
} from "./productEvents";

const ANONYMOUS_ID_KEY = "essence_analytics_id";
const REFERRER_KEY = "essence_referrer";

export function getAnonymousId(): string {
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;

  const id = window.crypto.randomUUID();
  window.localStorage.setItem(ANONYMOUS_ID_KEY, id);
  return id;
}

export function captureReferral(referrer: string): boolean {
  if (!/^[0-9a-f-]{36}$/i.test(referrer)) return false;
  if (referrer === getAnonymousId()) return false;
  window.localStorage.setItem(REFERRER_KEY, referrer);
  return true;
}

export function getInviteUrl(): string {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("ref", getAnonymousId());
  return url.toString();
}

export function trackProductEvent(
  event: ProductEventName,
  properties: ProductEventProperties = {},
): void {
  const referrer = window.localStorage.getItem(REFERRER_KEY);
  const enriched = referrer ? { ...properties, referrer } : properties;

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      anonymousId: getAnonymousId(),
      properties: enriched,
    }),
    keepalive: true,
  }).catch(() => {
    // Product analytics must never interrupt writing or sign-in.
  });
}
