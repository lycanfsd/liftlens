import { CalendarDays, Dumbbell } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { demoHistory } from "@/lib/demo-data";
import { getLocalDateKeyFromMaybeDate } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GeneratedWorkout, WorkoutHistoryItem } from "@/lib/types";
import { formatDate, toTitleCase } from "@/lib/utils";

type DailyHistoryRow = {
  id: string;
  workout_date: string;
  workout_json: unknown;
  input_snapshot: unknown;
  title: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function isGeneratedWorkout(value: unknown): value is GeneratedWorkout {
  if (typeof value !== "object" || value === null) return false;
  const workout = value as Partial<GeneratedWorkout>;
  return typeof workout.name === "string" && typeof workout.duration === "number" && Array.isArray(workout.exercises);
}

function dailyRowToHistory(row: DailyHistoryRow): WorkoutHistoryItem | null {
  const workout = isGeneratedWorkout(row.workout_json) ? row.workout_json : null;
  if (!workout) return null;

  const input = typeof row.input_snapshot === "object" && row.input_snapshot !== null
    ? (row.input_snapshot as { energy?: unknown; soreness?: unknown })
    : {};

  return {
    id: row.id,
    date: `${row.workout_date}T12:00:00`,
    workoutName: row.title ?? workout.name,
    duration: workout.duration,
    focus: toTitleCase(workout.focus),
    energy: typeof input.energy === "number" ? input.energy : 3,
    soreness: typeof input.soreness === "number" ? input.soreness : 2,
    completedExercises: workout.exercises.length
  };
}

async function getHistory(): Promise<WorkoutHistoryItem[]> {
  if (!isSupabaseConfigured) return demoHistory;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return [];

  const [{ data: dailyData }, { data }] = await Promise.all([
    supabase
      .from("daily_workouts")
      .select("id, workout_date, workout_json, input_snapshot, title, status, updated_at, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("workout_date", { ascending: false })
      .limit(30),
    supabase
      .from("workouts")
      .select("id, created_at, workout_date, workout_name, duration, focus, energy, soreness, completed_exercises")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  const dailyItems = ((dailyData ?? []) as DailyHistoryRow[]).map(dailyRowToHistory).filter(Boolean) as WorkoutHistoryItem[];
  const dailyDates = new Set(dailyItems.map((item) => getLocalDateKeyFromMaybeDate(item.date)));

  const rows =
    (data as
      | {
          id: string;
          created_at: string;
          workout_date?: string | null;
          workout_name: string;
          duration: number;
          focus: string;
          energy: number;
          soreness: number;
          completed_exercises: number;
        }[]
      | null) ?? [];

  const legacyItems = rows
    .filter((row) => {
      const dateKey = row.workout_date ?? getLocalDateKeyFromMaybeDate(row.created_at);
      return !dailyDates.has(dateKey);
    })
    .map((row) => ({
      id: row.id,
      date: row.workout_date ? `${row.workout_date}T12:00:00` : row.created_at,
      workoutName: row.workout_name,
      duration: row.duration,
      focus: toTitleCase(row.focus),
      energy: row.energy,
      soreness: row.soreness,
      completedExercises: row.completed_exercises
    }));

  return [...dailyItems, ...legacyItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);
}

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <>
      <PageHeader
        eyebrow="Workout history"
        title="Proof that flexible still counts."
        copy="Saved workouts appear here with the day's context, so progress is tied to real life instead of perfect conditions."
      />

      {history.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No completed workouts yet"
          copy="Generate today's adaptive session and save it as completed to start your history."
          actionLabel="Generate workout"
          href="/workout"
        />
      ) : (
        <div className="grid gap-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">{item.workoutName}</h2>
                    <Badge>{item.focus}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatDate(item.date)}
                    </span>
                    <span>{item.duration} min</span>
                    <span>{item.completedExercises} exercises</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-sm sm:w-52">
                  <div className="rounded-xl bg-white/[0.05] p-3">
                    <p className="text-muted-foreground">Energy</p>
                    <p className="mt-1 font-semibold text-white">{item.energy}/5</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.05] p-3">
                    <p className="text-muted-foreground">Soreness</p>
                    <p className="mt-1 font-semibold text-white">{item.soreness}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
