import { CalendarDays, Flame, Mail, ShieldCheck, Trophy, UserRound } from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileForm, type ProfileFormValues } from "@/components/profile-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfilePageData = {
  email: string;
  userId: string | null;
  avatarUrl: string | null;
  accountCreatedAt: string | null;
  planType: string;
  formValues: ProfileFormValues;
  snapshot: {
    completedWorkouts: number;
    currentStreak: number;
    mostTrainedFocus: string;
    consistency: number;
    weeklySessions: number;
  };
};

type WorkoutLogRow = {
  completed_at: string;
  focus: string | null;
};

function calculateStreak(days: string[]) {
  const uniqueDays = new Set(days);
  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 30; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!uniqueDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function formatDate(value: string | null) {
  if (!value) return "Available after signup";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function toNumberOrEmpty(value: unknown): number | "" {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getMostTrainedFocus(rows: WorkoutLogRow[]) {
  const focusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const focus = row.focus ?? "Full body";
    acc[focus] = (acc[focus] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(focusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Pending";
}

function buildSnapshot(rows: WorkoutLogRow[], weeklyTrainingDays: number | "") {
  const now = Date.now();
  const days = rows.map((row) => row.completed_at.slice(0, 10));
  const weeklyTarget = typeof weeklyTrainingDays === "number" ? weeklyTrainingDays : 4;
  const weekRows = rows.filter((row) => now - new Date(row.completed_at).getTime() <= 7 * 86400000);

  return {
    completedWorkouts: rows.length,
    currentStreak: calculateStreak(days),
    mostTrainedFocus: getMostTrainedFocus(rows),
    consistency: Math.min(100, Math.round((weekRows.length / weeklyTarget) * 100)),
    weeklySessions: weekRows.length
  };
}

async function getProfilePageData(): Promise<ProfilePageData> {
  if (!isSupabaseConfigured) {
    const formValues: ProfileFormValues = {
      display_name: "",
      age: "",
      sex: "",
      height: "",
      weight: "",
      training_experience: "intermediate",
      primary_goal: "recomposition",
      weekly_training_days: 4,
      preferred_workout_length: 35,
      equipment_access: "full-gym",
      weak_points: ["shoulders", "back"],
      biggest_struggle: "time",
      injury_notes: ""
    };

    return {
      email: "demo@flexfit.ai",
      userId: null,
      avatarUrl: null,
      accountCreatedAt: null,
      planType: "Free",
      formValues,
      snapshot: {
        completedWorkouts: 8,
        currentStreak: 3,
        mostTrainedFocus: "Upper",
        consistency: 86,
        weeklySessions: 3
      }
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const formValues: ProfileFormValues = {
      display_name: "",
      age: "",
      sex: "",
      height: "",
      weight: "",
      training_experience: "",
      primary_goal: "",
      weekly_training_days: "",
      preferred_workout_length: "",
      equipment_access: "",
      weak_points: [],
      biggest_struggle: "",
      injury_notes: ""
    };

    return {
      email: "Not signed in",
      userId: null,
      avatarUrl: null,
      accountCreatedAt: null,
      planType: "Free",
      formValues,
      snapshot: buildSnapshot([], "")
    };
  }

  const [{ data: profile }, { data: onboarding }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("onboarding_answers").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("workout_logs")
      .select("completed_at, focus")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(100)
  ]);

  const profileRow = (profile ?? {}) as Record<string, unknown>;
  const onboardingRow = (onboarding ?? {}) as Record<string, unknown>;
  const weakPoints =
    Array.isArray(profileRow.weak_points) && profileRow.weak_points.length > 0
      ? profileRow.weak_points.map(String)
      : Array.isArray(onboardingRow.weak_points)
        ? onboardingRow.weak_points.map(String)
        : [];

  const formValues: ProfileFormValues = {
    display_name: toStringValue(profileRow.display_name) || toStringValue(profileRow.full_name),
    age: toNumberOrEmpty(profileRow.age),
    sex: toStringValue(profileRow.sex),
    height: toStringValue(profileRow.height),
    weight: toStringValue(profileRow.weight),
    training_experience:
      toStringValue(profileRow.training_experience) ||
      toStringValue(profileRow.experience_level) ||
      toStringValue(onboardingRow.experience_level),
    primary_goal: toStringValue(profileRow.primary_goal) || toStringValue(onboardingRow.primary_goal),
    weekly_training_days:
      toNumberOrEmpty(profileRow.weekly_training_days) || toNumberOrEmpty(onboardingRow.weekly_availability),
    preferred_workout_length:
      toNumberOrEmpty(profileRow.preferred_workout_length) || toNumberOrEmpty(onboardingRow.typical_workout_length),
    equipment_access: toStringValue(profileRow.equipment_access) || toStringValue(onboardingRow.equipment_access),
    weak_points: weakPoints,
    biggest_struggle: toStringValue(profileRow.biggest_struggle) || toStringValue(onboardingRow.biggest_struggle),
    injury_notes: toStringValue(profileRow.injury_notes)
  };

  const rows = (logs ?? []) as WorkoutLogRow[];

  return {
    email: user.email ?? (toStringValue(profileRow.email) || "FlexFit member"),
    userId: user.id,
    avatarUrl: toStringValue(profileRow.avatar_url) || null,
    accountCreatedAt: user.created_at ?? toStringValue(profileRow.created_at) ?? null,
    planType: toStringValue(profileRow.plan_type) === "pro" ? "Pro" : "Free",
    formValues,
    snapshot: buildSnapshot(rows, formValues.weekly_training_days)
  };
}

export default async function ProfilePage() {
  const data = await getProfilePageData();

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your fitness context, all in one place."
        copy="Edit the details FlexFit uses to make workouts feel less generic and more like they belong to your actual week."
      />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.04] to-accent/10">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <AvatarUploader
                userId={data.userId}
                email={data.email}
                displayName={data.formValues.display_name}
                initialAvatarUrl={data.avatarUrl}
              />
              <span className="self-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:self-start">
                {data.planType}
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">Account</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </div>
                <p className="mt-2 break-all font-semibold text-white">{data.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  Member since
                </div>
                <p className="mt-2 font-semibold text-white">{formatDate(data.accountCreatedAt)}</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-5">
              <Button type="submit" variant="outline" className="w-full">
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-semibold">Progress snapshot</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">What FlexFit knows so far.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              If this is still empty, no problem. Save a few workouts and the signal gets sharper.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Workouts completed"
                value={`${data.snapshot.completedWorkouts}`}
                detail="Saved sessions"
                icon={Trophy}
                accent="green"
              />
              <StatCard
                label="Current streak"
                value={`${data.snapshot.currentStreak} days`}
                detail="Consecutive training days"
                icon={Flame}
                accent="blue"
              />
              <StatCard
                label="Most trained focus"
                value={data.snapshot.mostTrainedFocus}
                detail="Based on completed logs"
                icon={UserRound}
                accent="silver"
              />
              <StatCard
                label="Consistency"
                value={`${data.snapshot.consistency}%`}
                detail={`${data.snapshot.weeklySessions} sessions this week`}
                icon={ShieldCheck}
                accent="green"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="mt-6">
        <ProfileForm initialValues={data.formValues} />
      </div>
    </>
  );
}
