import { CalendarDays, Dumbbell } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { demoHistory } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkoutHistoryItem } from "@/lib/types";
import { formatDate, toTitleCase } from "@/lib/utils";

async function getHistory(): Promise<WorkoutHistoryItem[]> {
  if (!isSupabaseConfigured) return demoHistory;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("workouts")
    .select("id, created_at, workout_name, duration, focus, energy, soreness, completed_exercises")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const rows =
    (data as
      | {
          id: string;
          created_at: string;
          workout_name: string;
          duration: number;
          focus: string;
          energy: number;
          soreness: number;
          completed_exercises: number;
        }[]
      | null) ?? [];

  return rows.map((row) => ({
    id: row.id,
    date: row.created_at,
    workoutName: row.workout_name,
    duration: row.duration,
    focus: toTitleCase(row.focus),
    energy: row.energy,
    soreness: row.soreness,
    completedExercises: row.completed_exercises
  }));
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
