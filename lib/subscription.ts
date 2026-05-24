import "server-only";

import { isPaidPlan, normalizePlanType, type PlanType } from "@/lib/plans";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type SubscriptionAccess = {
  planType: PlanType;
  effectivePlanType: PlanType;
  hasPremiumAccess: boolean;
  devPremiumEnabled: boolean;
};

export function isDevPremiumEnabled() {
  return process.env.DEV_UNLOCK_PREMIUM === "true" && process.env.NODE_ENV !== "production";
}

export function hasPremiumAccess(planType: PlanType | null | undefined) {
  return isPaidPlan(planType) || isDevPremiumEnabled();
}

export function getEffectivePlanType(planType: PlanType) {
  return isDevPremiumEnabled() && !isPaidPlan(planType) ? "Elite" : planType;
}

export async function getUserSubscriptionAccess(
  supabase: SupabaseServerClient,
  userId: string
): Promise<SubscriptionAccess> {
  const { data } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("user_id", userId)
    .maybeSingle();

  const planType = normalizePlanType((data as { plan_type?: unknown } | null)?.plan_type);

  return {
    planType,
    effectivePlanType: getEffectivePlanType(planType),
    hasPremiumAccess: hasPremiumAccess(planType),
    devPremiumEnabled: isDevPremiumEnabled()
  };
}
