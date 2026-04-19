import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Vercel middleware has a hard ~25s execution limit. If Supabase is
// unreachable (e.g. the free-tier project auto-paused after inactivity),
// supabase.auth.getUser() hangs on the network call and the entire page
// 504s with MIDDLEWARE_INVOCATION_TIMEOUT. Fast-fail after this budget so
// the user sees the login page instead of a gateway-timeout error.
const AUTH_TIMEOUT_MS = 3000;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const isPublicPath = ["/auth/login", "/auth/callback", "/auth/register"].some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  // Fast-fail auth check. If Supabase is slow/unreachable, treat the
  // request as unauthenticated and fall through to the normal redirect —
  // never block the middleware on an external service.
  let user: { id: string } | null = null;
  try {
    const authPromise = supabase.auth.getUser().then((res) => res.data.user ?? null);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)
    );
    user = await Promise.race([authPromise, timeoutPromise]);
  } catch {
    user = null;
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
