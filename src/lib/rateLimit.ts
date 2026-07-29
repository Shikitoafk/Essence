import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Postgres-backed rate limiting. In-memory counters are useless here — Vercel
 * gives each request a possibly-cold lambda, so the counter has to live where
 * every instance can see it.
 *
 * These are PER-USER caps sitting under the Gemini free tier's PER-PROJECT
 * quota, which is the real ceiling (roughly 5 RPM / 20 RPD on the Flash models
 * the diagnostic tier uses, and 15 RPM / 500 RPD on the Flash Lite models the
 * conversation tier uses). Keeping each user well under those means one student
 * can't burn the whole project's day in a single sitting.
 */

export type UsageKind = "feedback" | "conversation";

interface Limit {
  perMinute: number;
  perDay: number;
}

const LIMITS: Record<UsageKind, Limit> = {
  // The expensive whole-essay scan. The project only gets ~20 Flash calls a day.
  feedback: { perMinute: 2, perDay: 8 },
  // Short-context chat turns on the Flash Lite tier — much more headroom.
  conversation: { perMinute: 8, perDay: 150 },
};

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind,
): Promise<RateLimitResult> {
  const limit = LIMITS[kind];
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("ai_usage")
    .select("created_at")
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false });

  // Never let a bookkeeping failure block a student's essay.
  if (error || !data) return { allowed: true };

  if (data.length >= limit.perDay) {
    return {
      allowed: false,
      message: `You've used today's ${limit.perDay} ${kind === "feedback" ? "full-essay scans" : "follow-up turns"}. This resets on a rolling 24-hour window.`,
      retryAfterSeconds: 3600,
    };
  }

  const inLastMinute = data.filter((row) => row.created_at >= minuteAgo).length;
  if (inLastMinute >= limit.perMinute) {
    return {
      allowed: false,
      message: "You're going a bit fast for the free Gemini tier. Try again in a minute.",
      retryAfterSeconds: 60,
    };
  }

  return { allowed: true };
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind,
): Promise<void> {
  await supabase.from("ai_usage").insert({ user_id: userId, kind });
}
