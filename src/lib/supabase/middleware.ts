import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/essays", "/settings"];

/**
 * True when an OAuth code has landed somewhere that cannot spend it.
 *
 * Supabase substitutes the project's Site URL when the `redirect_to` it was
 * given is not in the redirect allow-list. Sign-in then succeeds, the provider
 * sends the user back to the site root carrying `?code=...`, and the landing
 * page renders and drops it: no session is ever created, and every route the
 * student clicks bounces them back to /login with nothing to show for it.
 *
 * The allow-list is the real fix, but it lives in a dashboard rather than in
 * this repository, so a deployment can lose sign-in entirely without a line of
 * code changing. Forwarding the code to the callback costs one redirect and
 * removes that failure mode.
 */
export function isStrayOAuthCode(
  pathname: string,
  params: URLSearchParams,
): boolean {
  return pathname === "/" && params.has("code");
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isStrayOAuthCode(path, request.nextUrl.searchParams)) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    return NextResponse.redirect(callback);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Nothing to authenticate against yet. Send protected routes to /login, which
  // explains how to finish setup — otherwise they'd throw a bare 500.
  if (!url || !key) {
    if (isProtected) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
