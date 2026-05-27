import { PageHeader } from "@/components/page-header";
import { SafetyDisclaimer } from "@/components/safety-disclaimer";
import { WorkoutGenerator } from "@/components/workout-generator";
import { calculateMomentumSystem } from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExperienceLevel, FitnessGoal, WeakPoint } from "@/lib/types";
import { getCurrentUserTodayDailyWorkoutResult } from "@/lib/workout/daily-workouts";
import type { PerformanceTrend, WorkoutEngineContext } from "@/lib/workout/generator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fitnessGoalValues = ["lose-fat", "build-muscle", "recomposition", "strength", "general-health", "athletic-performance"];
const experienceValues = ["beginner", "intermediate", "advanced"];
const weakPointValues = ["chest", "shoulders", "arms", "back", "legs", "glutes", "core", "conditioning"];

function asFitnessGoal(value: unknown): FitnessGoal {
  return typeof value === "string" && fitnessGoalValues.includes(value) ? (value as FitnessGoal) : "recomposition";
}

function asExperience(value: unknown): ExperienceLevel {
  return typeof value === "string" && experienceValues.includes(value) ? (value as ExperienceLevel) : "intermediate";
}

function asWeakPoints(value: unknown): WeakPoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WeakPoint => typeof item === "string" && weakPointValues.includes(item));
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPerformanceTrend(
  currentWeekCount: number,
  previousWeekCount: number,
  recentEnergy: number | null,
  priorEnergy: number | null
): PerformanceTrend {
  if (currentWeekCount + previousWeekCount < 2) return "new";
  if (recentEnergy !== null && priorEnergy !== null && recentEnergy < priorEnergy - 0.5) return "declining";
  if (currentWeekCount >= previousWeekCount && recentEnergy !== null && recentEnergy >= 3.6) return "improving";
  return "steady";
}

async function getWorkoutEngineContext(): Promise<Partial<WorkoutEngineContext> | undefined> {
  if (!isSupabaseConfigured) return undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return undefined;

  const now = Date.now();
  const oneWeekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;

  const [{ data: profile }, { data: logs }, { data: exercises }] = await Promise.all([
    supabase
      .from("profiles")
      .select("primary_goal, training_experience, experience_level, weekly_training_days, preferred_workout_length, weak_points, injury_notes, biggest_struggle")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("workout_logs")
      .select("completed_at, duration, focus, energy, soreness")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(30),
    supabase
      .from("workout_exercises")
      .select("sets, created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(oneWeekAgo).toISOString())
  ]);

  const profileRow = (profile ?? {}) as Record<string, unknown>;
  const logRows = (logs ?? []) as {
    completed_at: string;
    duration: number | null;
    focus: string | null;
    energy: number | null;
    soreness: number | null;
  }[];
  const weeklyTrainingDays =
    typeof profileRow.weekly_training_days === "number" ? Math.min(Math.max(profileRow.weekly_training_days, 1), 7) : 4;
  const preferredWorkoutLength =
    typeof profileRow.preferred_workout_length === "number" ? Math.min(Math.max(profileRow.preferred_workout_length, 10), 120) : null;
  const momentum = calculateMomentumSystem(logRows, {
    weeklyTarget: weeklyTrainingDays,
    preferredWorkoutLength: preferredWorkoutLength ?? 35
  });
  const currentWeekLogs = logRows.filter((row) => new Date(row.completed_at).getTime() >= oneWeekAgo);
  const previousWeekLogs = logRows.filter((row) => {
    const time = new Date(row.completed_at).getTime();
    return time >= twoWeeksAgo && time < oneWeekAgo;
  });
  const recentEnergy = average(currentWeekLogs.map((row) => row.energy ?? 3));
  const priorEnergy = average(previousWeekLogs.map((row) => row.energy ?? 3));
  const averageEnergy = average(logRows.slice(0, 8).map((row) => row.energy ?? 3));
  const averageSoreness = average(logRows.slice(0, 8).map((row) => row.soreness ?? 2));
  const recoveryTrend =
    averageEnergy !== null && averageSoreness !== null && (averageEnergy <= 2.5 || averageSoreness >= 3.8)
      ? "strained"
      : averageEnergy !== null && averageSoreness !== null && averageEnergy >= 3.6 && averageSoreness <= 2.4
        ? "fresh"
        : "stable";

  return {
    goal: asFitnessGoal(profileRow.primary_goal),
    experienceLevel: asExperience(profileRow.training_experience || profileRow.experience_level),
    weeklyTrainingDays,
    preferredWorkoutLength,
    weakPoints: asWeakPoints(profileRow.weak_points),
    injuryNotes: typeof profileRow.injury_notes === "string" ? profileRow.injury_notes : null,
    dislikedExercises:
      typeof profileRow.biggest_struggle === "string" && profileRow.biggest_struggle === "gym-anxiety"
        ? ["barbell"]
        : [],
    completedThisWeek: currentWeekLogs.length,
    completedLastWeek: previousWeekLogs.length,
    averageEnergy,
    averageSoreness,
    performanceTrend: getPerformanceTrend(currentWeekLogs.length, previousWeekLogs.length, recentEnergy, priorEnergy),
    weeklyVolumeSets: ((exercises ?? []) as { sets: number | null }[]).reduce((sum, row) => sum + (row.sets ?? 0), 0),
    recoveryTrend,
    recentAdherence: momentum.adherencePercent / 100,
    momentumScore: momentum.score,
    momentumState: momentum.state,
    momentumProtectionMode: momentum.protectionMode,
    momentumRecoveryMode: momentum.recoveryMode
  };
}

export default async function WorkoutPage() {
  const [engineContext, todayWorkoutResult] = await Promise.all([
    getWorkoutEngineContext(),
    getCurrentUserTodayDailyWorkoutResult()
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Daily adaptive workout"
        title="Build today's workout"
        copy="Tell NOVYRA what today looks like. We'll adapt the plan around your energy, time, recovery, and gym setup."
      />
      <WorkoutGenerator
        engineContext={engineContext}
        initialDailyWorkout={todayWorkoutResult.record}
        currentUserId={todayWorkoutResult.userId}
      />
      <div className="mt-6">
        <SafetyDisclaimer />
      </div>
    </>
  );
}
