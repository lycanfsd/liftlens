export type PlanType = "Free" | "Pro" | "Elite";

export function normalizePlanType(value: unknown): PlanType {
  if (typeof value !== "string") return "Free";

  const normalized = value.trim().toLowerCase();
  if (normalized === "elite") return "Elite";
  if (normalized === "pro") return "Pro";

  return "Free";
}

export function isPaidPlan(planType: PlanType | null | undefined) {
  return planType === "Pro" || planType === "Elite";
}

export function isPaidPlanValue(value: unknown) {
  return isPaidPlan(normalizePlanType(value));
}
