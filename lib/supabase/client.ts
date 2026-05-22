"use client";

import { createBrowserClient } from "@supabase/ssr";

import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl
} from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
