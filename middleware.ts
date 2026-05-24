import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl
} from "@/lib/supabase/config";

const protectedRoutes = [
  "/dashboard",
  "/workout",
  "/form-coach",
  "/recovery",
  "/weak-points",
  "/history",
  "/coach",
  "/profile",
  "/settings",
  "/onboarding"
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)"
  ]
};
