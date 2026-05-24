import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { normalizePlanType } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUserIdentity } from "@/lib/types";

function getText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export default async function ProtectedAppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userIdentity: AppUserIdentity = {
    userId: null,
    email: "demo@flexfit.ai",
    displayName: "Demo Athlete",
    avatarUrl: null,
    planType: "Free"
  };

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name, avatar_url, plan_type")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileRow = (profile ?? {}) as Record<string, unknown>;

    userIdentity = {
      userId: user.id,
      email: getText(profileRow.email) ?? user.email ?? "FlexFit member",
      displayName: getText(profileRow.display_name),
      avatarUrl: getText(profileRow.avatar_url),
      planType: normalizePlanType(profileRow.plan_type)
    };
  }

  return <AppShell userIdentity={userIdentity}>{children}</AppShell>;
}
