import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProgressAnalyticsCenter } from "@/components/progress-analytics-center";
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

export const dynamic = "force-dynamic";

type WorkoutLogRow = {
  workout_id: string | null;
  completed_at: string;
  duration: number | null;
  focus: string | null;
  energy: number | null;
  soreness: number | null;
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
    { data: logs, error: logsError },
    { data: prRows },
    { data: physiqueRows },
    { data: recoveryRows }
  ] = await Promise.all([
    supabase.from("profiles").select("weekly_training_days, primary_goal, weak_points").eq("user_id", user.id).maybeSingle(),
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

  if (logsError) {
    return { analytics: buildProgressAnalytics({ logs: [], exercises: [], weeklyTarget: 5 }), userId: user.id, ...emptyAccountMetrics };
  }

  const logRows = ((logs ?? []) as WorkoutLogRow[]).filter((row) => row.completed_at);
  const workoutLogs: ProgressWorkoutLog[] = logRows.map((row, index) => ({
    id: row.workout_id ?? `log-${index}`,
    workoutId: row.workout_id,
    completedAt: row.completed_at,
    duration: row.duration ?? 35,
    focus: row.focus ?? "Full body",
    energy: row.energy,
    soreness: row.soreness
  }));
  const workoutIds = Array.from(new Set(logRows.map((row) => row.workout_id).filter(Boolean))) as string[];
  let exercises: ExercisePerformanceEntry[] = [];

  if (workoutIds.length) {
    const { data: exerciseRows } = await supabase
      .from("workout_exercises")
      .select("workout_id, name, muscle_group, sets, reps")
      .in("workout_id", workoutIds);
    const dateByWorkoutId = new Map(logRows.map((row) => [row.workout_id, row.completed_at]));

    exercises = ((exerciseRows ?? []) as WorkoutExerciseRow[])
      .filter((row) => row.workout_id && row.name)
      .map((row, index) => ({
        id: `${row.workout_id}-${index}`,
        date: dateByWorkoutId.get(row.workout_id) ?? new Date().toISOString(),
        exerciseName: row.name ?? "Exercise",
        muscleGroup: row.muscle_group,
        sets: row.sets ?? 2,
        reps: parseReps(row.reps),
        weight: null
      }));
  }

  const profileRow = (profile ?? {}) as { weekly_training_days?: unknown; primary_goal?: unknown; weak_points?: unknown };
  const weeklyTarget = typeof profileRow.weekly_training_days === "number" ? profileRow.weekly_training_days : 5;
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
        <div className="hidden rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary sm:inline-flex sm:items-center sm:gap-2">
          <BarChart3 className="h-4 w-4" />
          Physique signal center
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
