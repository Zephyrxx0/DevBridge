import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith('/api/backend') && user) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-User-Id', user.id);
    requestHeaders.set('X-Internal-Auth', process.env.INTERNAL_AUTH_TOKEN || 'dev-token-default');
    
    // We need to preserve cookies set during getUser()
    const newResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    // Copy over any cookies that were set
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      newResponse.cookies.set(cookie.name, cookie.value);
    });
    
    supabaseResponse = newResponse;
  }

  return supabaseResponse;
}
