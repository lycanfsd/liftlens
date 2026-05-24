import { BarChart3, CheckCircle2, Clock, Flame, Gauge, ListChecks, Route, Sparkles, TimerReset } from "lucide-react";

import { ExerciseCard } from "@/components/exercise-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GeneratedWorkout } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";

function intensityCopy(intensity: GeneratedWorkout["intensity"]) {
  if (intensity === "restore") {
    return {
      title: "Protect the habit",
      copy: "Lower volume, cleaner reps, and no heroics. The win is leaving better than you arrived."
    };
  }

  if (intensity === "push") {
    return {
      title: "Use the green light",
      copy: "You have enough signal to work hard, but the plan still keeps guardrails around fatigue."
    };
  }

  return {
    title: "Build steady momentum",
    copy: "Enough work to progress, simple enough to finish when the day is busy."
  };
}

export function WorkoutCard({
  workout,
  onSave,
  saveLabel = "Save as completed",
  saving = false,
  message
}: {
  workout: GeneratedWorkout;
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
  message?: string;
}) {
  const strategy = intensityCopy(workout.intensity);

  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-white/[0.08] to-white/[0.035]">
      <CardContent className="p-0">
        <section className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-primary/25 bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Adaptive plan
            </Badge>
            <Badge>{toTitleCase(workout.intensity)}</Badge>
            <Badge>{toTitleCase(workout.focus)}</Badge>
            {workout.trainingGoal ? <Badge>{toTitleCase(workout.trainingGoal)}</Badge> : null}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="text-sm font-semibold text-primary">{strategy.title}</p>
              <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{workout.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{strategy.copy}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-accent" />
                  Duration
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{workout.duration} min</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="h-4 w-4 text-primary" />
                  Training block
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{workout.exercises.length} moves</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gauge className="h-4 w-4 text-accent" />
                  Recovery
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{workout.recoveryScore ?? "--"}/100</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Effort target
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  RIR {workout.targetRir ?? 2}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">RPE {workout.targetRpe ?? 8}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <ListChecks className="h-4 w-4 text-primary" />
                Warmup
              </h3>
              <div className="mt-4 space-y-2">
                {workout.warmup.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-white">{index + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <TimerReset className="h-4 w-4 text-primary" />
                15-minute escape hatch
              </h3>
              <div className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                {workout.condensed.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <BarChart3 className="h-4 w-4 text-primary" />
                Training logic
              </h3>
              <div className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                {workout.weeklyVolumeTarget ? <p>Volume landmark: {workout.weeklyVolumeTarget}</p> : null}
                {workout.deload ? <p>Deload: {workout.deload.reason}</p> : null}
                {workout.progression ? (
                  <>
                    <p>{workout.progression.estimatedOneRepMax}</p>
                    <p>{workout.progression.performanceTrend}</p>
                    <p>{workout.progression.adherence}</p>
                    <p>{workout.progression.weeklyVolume}</p>
                    <p>{workout.progression.recoveryTrend}</p>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <h3 className="px-2 py-2 font-semibold text-white">Main work</h3>
            <div className="space-y-3">
              {workout.exercises.map((exercise, index) => (
                <ExerciseCard key={`${exercise.name}-${index}`} exercise={exercise} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Route className="h-4 w-4 text-accent" />
                Why this fits today
              </h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {workout.why.map((reason) => (
                  <div key={reason} className="rounded-xl bg-black/25 p-3 text-sm leading-6 text-muted-foreground">
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Completion standard
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Finish with clean reps and one small note about energy. That is enough data for tomorrow.
              </p>
              {onSave ? (
                <Button onClick={onSave} disabled={saving} className="mt-4 w-full">
                  {saving ? "Saving..." : saveLabel}
                </Button>
              ) : null}
              {message ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
            </div>
          </div>

          {workout.adaptationNotes?.length ? (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Sparkles className="h-4 w-4 text-primary" />
                Adaptive coaching notes
              </h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {workout.adaptationNotes.map((note) => (
                  <p key={note} className="rounded-xl bg-black/25 p-3 text-sm leading-6 text-muted-foreground">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
