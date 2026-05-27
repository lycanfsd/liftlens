import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProgressAnalyticsCenter } from "@/components/progress-analytics-center";
import { Button } from "@/components/ui/button";
import type { PhysiqueMeasurementEntry } from "@/lib/progress/physique-metrics";
import type { PRHistoryEntry } from "@/lib/progress/pr-history";
import {
  buildProgressAnalytics,
  demoProgressInputs,
  type ExercisePerformanceEntry,
  type ProgressWorkoutLog
} from "@/lib/progress/progress-analytics";
import type { RecoveryLogEntry } from "@/lib/progress/recovery-metrics";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExercisePrescription, GeneratedWorkout } from "@/lib/types";

export const dynamic = "force-dynamic";

type WorkoutLogRow = {
  workout_id: string | null;
  completed_at: string;
  duration: number | null;
  focus: string | null;
  energy: number | null;
  soreness: number | null;
};

type DailyWorkoutProgressRow = {
  id: string;
  workout_date: string;
  workout_json: unknown;
  input_snapshot: unknown;
  title: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type WorkoutExerciseRow = {
  workout_id: string | null;
  name: string | null;
  muscle_group: string | null;
  sets: number | null;
  reps: string | null;
};

type PRHistoryRow = {
  id: string;
  lift: string;
  date: string;
  one_rep_max: number;
  unit: "lb" | "kg" | null;
  notes: string | null;
  created_at: string;
};

type PhysiqueMeasurementRow = {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  shoulders: number | null;
  arms: number | null;
  thighs: number | null;
  hips_glutes: number | null;
  body_fat: number | null;
};

type RecoveryLogRow = {
  id: string;
  date: string;
  sleep_hours: number;
  energy: number;
  soreness: number;
  stress: number;
  workout_rpe: number;
  score: number;
};

const emptyAccountMetrics = {
  prEntries: [] as PRHistoryEntry[],
  physiqueEntries: [] as PhysiqueMeasurementEntry[],
  recoveryEntries: [] as RecoveryLogEntry[],
  profileGoal: null as string | null,
  weakPoints: [] as string[]
};

function parseReps(value: string | null) {
  if (!value) return 8;
  const firstNumber = value.match(/\d+/)?.[0];
  return firstNumber ? Number(firstNumber) : 8;
}

function debugProgress(event: string, details?: Record<string, unknown>) {
  if (process.env.DEBUG_PROGRESS_ANALYTICS === "true") {
    console.debug(`[progress-analytics] ${event}`, details ?? {});
  }
}

function isGeneratedWorkout(value: unknown): value is GeneratedWorkout {
  if (typeof value !== "object" || value === null) return false;
  const workout = value as Partial<GeneratedWorkout>;

  return typeof workout.name === "string" && typeof workout.duration === "number" && Array.isArray(workout.exercises);
}

function completedAtForDailyWorkout(row: DailyWorkoutProgressRow) {
  return row.updated_at ?? row.created_at ?? `${row.workout_date}T12:00:00.000Z`;
}

function dailyWorkoutToLog(row: DailyWorkoutProgressRow, workout: GeneratedWorkout): ProgressWorkoutLog {
  const input = typeof row.input_snapshot === "object" && row.input_snapshot !== null
    ? (row.input_snapshot as { energy?: unknown; soreness?: unknown })
    : {};

  return {
    id: row.id,
    workoutId: row.id,
    workoutDate: row.workout_date,
    title: row.title ?? workout.name,
    completedAt: completedAtForDailyWorkout(row),
    duration: workout.duration,
    focus: workout.focus ?? "Full body",
    energy: typeof input.energy === "number" ? input.energy : null,
    soreness: typeof input.soreness === "number" ? input.soreness : null,
    completedExercises: workout.exercises.length
  };
}

function dailyWorkoutToExercises(row: DailyWorkoutProgressRow, workout: GeneratedWorkout): ExercisePerformanceEntry[] {
  return workout.exercises.map((exercise: ExercisePrescription, index) => ({
    id: `${row.id}-${index}`,
    workoutId: row.id,
    date: completedAtForDailyWorkout(row),
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sets: exercise.sets,
    reps: parseReps(exercise.reps),
    weight: null
  }));
}

async function getProgressAnalytics() {
  if (!isSupabaseConfigured) {
    return { analytics: buildProgressAnalytics(demoProgressInputs()), userId: null, ...emptyAccountMetrics };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { analytics: buildProgressAnalytics(demoProgressInputs()), userId: null, ...emptyAccountMetrics };
  }

  const [
    { data: profile },
    { data: dailyRows, error: dailyError },
    { data: logs, error: logsError },
    { data: prRows },
    { data: physiqueRows },
    { data: recoveryRows }
  ] = await Promise.all([
    supabase.from("profiles").select("weekly_training_days, primary_goal, weak_points").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("daily_workouts")
      .select("id, workout_date, workout_json, input_snapshot, title, status, updated_at, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("workout_date", { ascending: false })
      .limit(180),
    supabase
      .from("workout_logs")
      .select("workout_id, completed_at, duration, focus, energy, soreness")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(120),
    supabase
      .from("pr_history")
      .select("id, lift, date, one_rep_max, unit, notes, created_at")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("physique_measurements")
      .select("id, date, weight, waist, chest, shoulders, arms, thighs, hips_glutes, body_fat")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("recovery_logs")
      .select("id, date, sleep_hours, energy, soreness, stress, workout_rpe, score")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100)
  ]);

  if (dailyError && logsError) {
    debugProgress("history fetch failed", {
      user_id: user.id,
      daily_workouts: dailyError.message,
      workout_logs: logsError.message
    });
    return { analytics: buildProgressAnalytics({ logs: [], exercises: [], weeklyTarget: 5 }), userId: user.id, ...emptyAccountMetrics };
  }

  const completedDailyRows = ((dailyRows ?? []) as DailyWorkoutProgressRow[])
    .filter((row) => row.status === "completed" && row.workout_date)
    .map((row) => ({ row, workout: isGeneratedWorkout(row.workout_json) ? row.workout_json : null }))
    .filter((item): item is { row: DailyWorkoutProgressRow; workout: GeneratedWorkout } => Boolean(item.workout));
  const dailyWorkoutDates = new Set(completedDailyRows.map((item) => item.row.workout_date));
  const dailyLogs = completedDailyRows.map((item) => dailyWorkoutToLog(item.row, item.workout));
  const dailyExercises = completedDailyRows.flatMap((item) => dailyWorkoutToExercises(item.row, item.workout));
  const legacyLogRows = ((logs ?? []) as WorkoutLogRow[]).filter((row) => {
    if (!row.completed_at) return false;
    const dateKey = row.completed_at.slice(0, 10);
    return !dailyWorkoutDates.has(dateKey);
  });
  const legacyWorkoutLogs: ProgressWorkoutLog[] = legacyLogRows.map((row, index) => ({
    id: row.workout_id ?? `log-${index}`,
    workoutId: row.workout_id,
    workoutDate: row.completed_at.slice(0, 10),
    title: row.focus ?? "Completed workout",
    completedAt: row.completed_at,
    duration: row.duration ?? 35,
    focus: row.focus ?? "Full body",
    energy: row.energy,
    soreness: row.soreness
  }));
  const workoutLogs = [...dailyLogs, ...legacyWorkoutLogs];
  const workoutIds = Array.from(new Set(legacyLogRows.map((row) => row.workout_id).filter(Boolean))) as string[];
  let legacyExercises: ExercisePerformanceEntry[] = [];

  if (workoutIds.length) {
    const { data: exerciseRows } = await supabase
      .from("workout_exercises")
      .select("workout_id, name, muscle_group, sets, reps")
      .in("workout_id", workoutIds);
    const dateByWorkoutId = new Map(legacyLogRows.map((row) => [row.workout_id, row.completed_at]));

    legacyExercises = ((exerciseRows ?? []) as WorkoutExerciseRow[])
      .filter((row) => row.workout_id && row.name)
      .map((row, index) => ({
        id: `${row.workout_id}-${index}`,
        workoutId: row.workout_id,
        date: dateByWorkoutId.get(row.workout_id) ?? new Date().toISOString(),
        exerciseName: row.name ?? "Exercise",
        muscleGroup: row.muscle_group,
        sets: row.sets ?? 2,
        reps: parseReps(row.reps),
        weight: null
      }));
  }
  const exercises = [...dailyExercises, ...legacyExercises];

  const profileRow = (profile ?? {}) as { weekly_training_days?: unknown; primary_goal?: unknown; weak_points?: unknown };
  const weeklyTarget = typeof profileRow.weekly_training_days === "number" ? profileRow.weekly_training_days : 5;

  debugProgress("history fetch success", {
    user_id: user.id,
    completed_daily_workouts: dailyLogs.length,
    legacy_workout_logs: legacyWorkoutLogs.length,
    completed_workouts: workoutLogs.length,
    exercise_entries: exercises.length
  });

  const prEntries: PRHistoryEntry[] = ((prRows ?? []) as PRHistoryRow[]).map((row) => ({
    id: row.id,
    lift: row.lift,
    date: row.date,
    oneRepMax: row.one_rep_max,
    unit: row.unit === "kg" ? "kg" : "lb",
    notes: row.notes ?? undefined,
    createdAt: row.created_at
  }));
  const physiqueEntries: PhysiqueMeasurementEntry[] = ((physiqueRows ?? []) as PhysiqueMeasurementRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    weight: row.weight,
    waist: row.waist,
    chest: row.chest,
    shoulders: row.shoulders,
    arms: row.arms,
    thighs: row.thighs,
    hipsGlutes: row.hips_glutes,
    bodyFat: row.body_fat
  }));
  const recoveryEntries: RecoveryLogEntry[] = ((recoveryRows ?? []) as RecoveryLogRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    sleepHours: row.sleep_hours,
    energy: row.energy,
    soreness: row.soreness,
    stress: row.stress,
    workoutRpe: row.workout_rpe,
    score: row.score
  }));

  return {
    analytics: buildProgressAnalytics({
      logs: workoutLogs,
      exercises,
      weeklyTarget
    }),
    userId: user.id,
    prEntries,
    physiqueEntries,
    recoveryEntries,
    profileGoal: typeof profileRow.primary_goal === "string" ? profileRow.primary_goal : null,
    weakPoints: Array.isArray(profileRow.weak_points) ? profileRow.weak_points.map(String) : []
  };
}

export default async function ProgressPage() {
  const { analytics, userId, prEntries, physiqueEntries, recoveryEntries, profileGoal, weakPoints } = await getProgressAnalytics();

  return (
    <>
      <PageHeader
        eyebrow="Progress center"
        title="Progress Analytics"
        copy="Track your consistency, strength, physique, and recovery over time."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="hidden rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary sm:inline-flex sm:items-center sm:gap-2">
            <BarChart3 className="h-4 w-4" />
            Physique signal center
          </div>
          <Button asChild>
            <a href={analytics.hasRealWorkoutData ? "#strength-prs" : "/workout"}>
              {analytics.hasRealWorkoutData ? "Log PR" : "View Today"}
            </a>
          </Button>
        </div>
      </PageHeader>
      <ProgressAnalyticsCenter
        analytics={analytics}
        userId={userId}
        initialPrEntries={prEntries}
        initialPhysiqueEntries={physiqueEntries}
        initialRecoveryEntries={recoveryEntries}
        profileGoal={profileGoal}
        weakPoints={weakPoints}
      />
    </>
  );
}
