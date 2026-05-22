import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl
} from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware and actions can.
        }
      }
    }
  });
}
