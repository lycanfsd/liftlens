import { Repeat2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ExercisePrescription } from "@/lib/types";

export function ExerciseCard({ exercise, index }: { exercise: ExercisePrescription; index: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-white">{exercise.name}</h4>
            <Badge>{exercise.muscleGroup}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{exercise.cue}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:max-w-md">
            <div className="rounded-xl bg-white/[0.05] p-2">
              <div className="text-muted-foreground">Sets</div>
              <div className="mt-1 font-semibold text-white">{exercise.sets}</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2">
              <div className="text-muted-foreground">Reps</div>
              <div className="mt-1 font-semibold text-white">{exercise.reps}</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2">
              <div className="text-muted-foreground">Rest</div>
              <div className="mt-1 font-semibold text-white">{exercise.rest}</div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/15 bg-accent/10 p-3 text-xs leading-5 text-accent">
            <Repeat2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {exercise.substitution}
          </div>
        </div>
      </div>
    </div>
  );
}
