import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }

  return value;
}

function getErrorRedirectUrl(request: NextRequest, message: string) {
  const url = new URL("/auth/error", request.url);
  url.searchParams.set("message", message);
  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const providerError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(getErrorRedirectUrl(request, providerError));
  }

  if (!code) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return NextResponse.redirect(
      getErrorRedirectUrl(request, "This confirmation link is missing its login code. Please request a new confirmation email.")
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(getErrorRedirectUrl(request, error.message));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
