import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProgressAnalyticsCenter } from "@/components/progress-analytics-center";
import {
  buildProgressAnalytics,
  demoProgressInputs,
  type ExercisePerformanceEntry,
  type ProgressWorkoutLog
} from "@/lib/progress/progress-analytics";
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

function parseReps(value: string | null) {
  if (!value) return 8;
  const firstNumber = value.match(/\d+/)?.[0];
  return firstNumber ? Number(firstNumber) : 8;
}

async function getProgressAnalytics() {
  if (!isSupabaseConfigured) {
    return { analytics: buildProgressAnalytics(demoProgressInputs()), userId: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { analytics: buildProgressAnalytics(demoProgressInputs()), userId: null };
  }

  const [{ data: profile }, { data: logs, error: logsError }] = await Promise.all([
    supabase.from("profiles").select("weekly_training_days").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("workout_logs")
      .select("workout_id, completed_at, duration, focus, energy, soreness")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(120)
  ]);

  if (logsError) {
    return { analytics: buildProgressAnalytics(demoProgressInputs()), userId: user.id };
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

  const profileRow = (profile ?? {}) as { weekly_training_days?: unknown };
  const weeklyTarget = typeof profileRow.weekly_training_days === "number" ? profileRow.weekly_training_days : 5;

  return {
    analytics: buildProgressAnalytics({
      logs: workoutLogs,
      exercises,
      weeklyTarget
    }),
    userId: user.id
  };
}

export default async function ProgressPage() {
  const { analytics, userId } = await getProgressAnalytics();

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
      <ProgressAnalyticsCenter analytics={analytics} userId={userId} />
    </>
  );
}
