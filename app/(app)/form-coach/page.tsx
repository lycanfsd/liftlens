import { CheckCircle2, ChevronRight, Lock, Video } from "lucide-react";

import { FormCoachClient, type FormCheckHistoryItem } from "@/components/form-coach-client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formCoachExercises } from "@/lib/form-coach";
import { isPaidPlan, normalizePlanType, type PlanType } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toTitleCase } from "@/lib/utils";

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

type FormCoachPageData = {
  planType: PlanType;
  history: FormCheckHistoryItem[];
};

function getExerciseLabel(value: string) {
  return formCoachExercises.find((exercise) => exercise.value === value)?.label ?? toTitleCase(value);
}

function FormCoachUpgradeScreen() {
  const features = [
    "AI lifting form analysis",
    "safety-focused correction cues",
    "form check history",
    "progress over time"
  ];

  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/14 via-white/[0.045] to-accent/10">
      <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            <Lock className="h-3.5 w-3.5" />
            Pro access
          </span>
          <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
            AI Form Coach is a Pro feature
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Upload a set, get form feedback, and receive cues before your next lift.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-white">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="/pricing">
                Upgrade to Pro
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/dashboard">Back to dashboard</a>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <div className="aspect-video rounded-2xl border border-dashed border-white/15 bg-white/[0.035] p-5">
            <div className="grid h-full place-items-center text-center">
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Video className="h-7 w-7" />
                </span>
                <p className="mt-4 font-semibold text-white">Form feedback before the next set.</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Pro unlocks upload, analysis, and saved check history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function getFormCoachPageData(): Promise<FormCoachPageData> {
  if (!isSupabaseConfigured) {
    return {
      planType: "Free",
      history: []
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      planType: "Free",
      history: []
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const planType = normalizePlanType((profile as { plan_type?: unknown } | null)?.plan_type);

  if (!isPaidPlan(planType)) {
    return {
      planType,
      history: []
    };
  }

  const { data } = await supabase
    .from("form_checks")
    .select("id, exercise, form_score, corrections, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const rows =
    (data as
      | {
          id: string;
          exercise: string;
          form_score: number;
          corrections: unknown;
          created_at: string;
        }[]
      | null) ?? [];

  return {
    planType,
    history: rows.map((row) => {
      const corrections = asStringArray(row.corrections);

      return {
        id: row.id,
        exercise: getExerciseLabel(row.exercise),
        formScore: row.form_score,
        date: row.created_at,
        topCorrection: corrections[0] ?? "Keep the next set smooth and controlled."
      };
    })
  };
}

export default async function FormCoachPage() {
  const { history, planType } = await getFormCoachPageData();
  const hasFormCoachAccess = isPaidPlan(planType);

  return (
    <>
      <PageHeader
        eyebrow="AI Form Coach"
        title="Upload a set. Get clear coaching cues before your next set."
        copy="A camera-first coaching flow for quick, safety-minded feedback on the lifts people actually film at the gym."
      >
        {hasFormCoachAccess ? (
          <Button asChild variant="outline">
            <a href="#form-history">
              <Video className="h-4 w-4" />
              View history
            </a>
          </Button>
        ) : null}
      </PageHeader>

      {hasFormCoachAccess ? (
        <FormCoachClient initialHistory={history} demoMode={!isSupabaseConfigured} />
      ) : (
        <FormCoachUpgradeScreen />
      )}
    </>
  );
}
