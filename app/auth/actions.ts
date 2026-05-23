"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAppUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
  status?: "confirmation_required" | "confirmation_resent";
  email?: string;
};

const authSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(6, "Use at least 6 characters.")
});

function getNextPath(formData: FormData) {
  const next = formData.get("next");
  return typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
}

function getRedirectOrigin(formData: FormData) {
  const redirectOrigin = formData.get("redirect_origin");

  if (typeof redirectOrigin === "string") {
    try {
      const parsed = new URL(redirectOrigin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Fall back to configured app URL below.
    }
  }

  return getAppUrl();
}

function getSignupEmailRedirectTo(formData: FormData) {
  return `${getRedirectOrigin(formData)}/auth/callback?next=/onboarding`;
}

export async function loginAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Check your login details." };
  }

  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet. Add env vars or use demo mode." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(getNextPath(formData));
}

export async function signupAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Check your signup details." };
  }

  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet. Add env vars or use demo mode." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: getSignupEmailRedirectTo(formData)
    }
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      status: "confirmation_required",
      email: parsed.data.email,
      message: "Confirmation email sent."
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function resendConfirmationAction(
  _previous: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z
    .object({
      email: z.string().email("Enter a valid email.")
    })
    .safeParse({
      email: formData.get("email")
    });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Enter a valid email." };
  }

  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured yet." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: getSignupEmailRedirectTo(formData)
    }
  });

  if (error) {
    return {
      status: "confirmation_required",
      email: parsed.data.email,
      error: error.message
    };
  }

  return {
    status: "confirmation_resent",
    email: parsed.data.email,
    message: `We sent another confirmation link to ${parsed.data.email}.`
  };
}

export async function logoutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/");
}
