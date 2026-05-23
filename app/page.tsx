import { LandingPage } from "@/components/landing-page";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let isAuthenticated = false;

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    isAuthenticated = Boolean(user);
  }

  return <LandingPage isAuthenticated={isAuthenticated} />;
}
