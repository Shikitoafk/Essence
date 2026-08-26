import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth / email-confirmation landing point: swaps the code for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Local sign-in must return to the local app. `NEXT_PUBLIC_SITE_URL`
      // normally names the Vercel deployment, so using it unconditionally
      // would silently bounce a localhost session into production.
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(
        origin,
      );
      // Behind a production proxy (Vercel) the forwarded host is the
      // user-facing one.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const base =
        isLocal
          ? origin
          : process.env.NEXT_PUBLIC_SITE_URL ??
            (process.env.NODE_ENV === "production" && forwardedHost
              ? `https://${forwardedHost}`
              : origin);
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
