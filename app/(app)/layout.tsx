import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedAppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userEmail = "demo@flexfit.ai";

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    userEmail = user.email ?? "FlexFit member";
  }

  return <AppShell userEmail={userEmail}>{children}</AppShell>;
}
