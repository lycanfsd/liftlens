import { Gauge, Link2, Repeat2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ExercisePrescription } from "@/lib/types";

type ExercisePill = {
  label: string;
  tone?: "positive" | "neutral" | "caution" | "accent";
};

function pillTone(tone: ExercisePill["tone"] = "neutral") {
  if (tone === "positive") return "border-primary/25 bg-primary/10 text-primary";
  if (tone === "caution") return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  if (tone === "accent") return "border-accent/25 bg-accent/10 text-accent";
  return "border-white/10 bg-white/[0.045] text-muted-foreground";
}

function uniquePills(pills: ExercisePill[]) {
  const seen = new Set<string>();
  return pills.filter((pill) => {
    const key = pill.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function progressionTag(rule?: string): ExercisePill | null {
  const text = rule?.toLowerCase() ?? "";
  if (!text) return null;
  if (text.includes("no load jumps")) return { label: "Overload paused", tone: "caution" };
  if (text.includes("load jump")) return { label: "Progression available", tone: "positive" };
  return { label: "Reps before load", tone: "neutral" };
}

function adaptationTag(adaptation?: string): ExercisePill | null {
  const text = adaptation?.toLowerCase() ?? "";
  if (!text) return null;
  if (text.includes("deload")) return { label: "Deload tempo", tone: "caution" };
  if (text.includes("compressed")) return { label: "Minimal setup required", tone: "accent" };
  if (text.includes("rir")) return { label: "RIR-capped effort", tone: "neutral" };
  return null;
}

function exerciseInsights(exercise: ExercisePrescription): ExercisePill[] {
  const text = `${exercise.rationale ?? ""} ${exercise.adaptation ?? ""} ${exercise.progressionRule ?? ""} ${
    exercise.substitution
  }`.toLowerCase();

  return uniquePills([
    text.includes("weak") ? { label: "Weak point priority", tone: "positive" } : null,
    exercise.stimulusToFatigue && exercise.stimulusToFatigue >= 1.6
      ? { label: "High stimulus efficiency", tone: "positive" }
      : null,
    exercise.fatigueScore && exercise.fatigueScore <= 2 ? { label: "Low fatigue movement", tone: "positive" } : null,
    exercise.targetRir && exercise.targetRir >= 3 ? { label: "Recovery-friendly selection", tone: "neutral" } : null,
    ["bodyweight", "dumbbells-only", "band", "cable"].includes(exercise.equipment)
      ? { label: "Minimal setup required", tone: "accent" }
      : null,
    text.includes("safer") || exercise.safetyNote ? { label: "Joint-friendly variation", tone: "caution" } : null,
    exercise.supersetWith ? { label: "Superset-ready", tone: "accent" } : null,
    progressionTag(exercise.progressionRule),
    adaptationTag(exercise.adaptation),
    !text.includes("weak") && exercise.fatigueScore && exercise.fatigueScore >= 4
      ? { label: "Performance-focused ordering", tone: "neutral" }
      : null
  ].filter(Boolean) as ExercisePill[]);
}

function compactSubstitution(substitution: string) {
  return substitution
    .replace(/\s+if equipment or comfort changes\.$/, "")
    .replace(/\s+if waiting would break flow\.$/, "")
    .replace(/\.$/, "");
}

function compactSafety(note: string) {
  if (note.toLowerCase().includes("sharp pain")) return "Stop if pain changes your mechanics.";
  return note.replace(/\.$/, "");
}

function ExercisePills({ pills }: { pills: ExercisePill[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${pillTone(pill.tone)}`}
        >
          {pill.label}
        </span>
      ))}
    </div>
  );
}

export function ExerciseCard({ exercise, index }: { exercise: ExercisePrescription; index: number }) {
  const insights = exerciseInsights(exercise);

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
            {exercise.movementPattern ? <Badge>{exercise.movementPattern}</Badge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{exercise.cue}</p>

          {insights.length ? (
            <div className="mt-3">
              <ExercisePills pills={insights} />
            </div>
          ) : null}

          {exercise.supersetWith ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 text-accent" />
              Superset: {exercise.supersetWith}
            </div>
          ) : null}

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
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Gauge className="h-3 w-3 text-primary" />
                Effort
              </div>
              <div className="mt-1 font-semibold text-white">
                RIR {exercise.targetRir ?? 2} / RPE {exercise.targetRpe ?? 8}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="text-muted-foreground">SFR</div>
              <div className="mt-1 font-semibold text-white">{exercise.stimulusToFatigue ?? "--"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="text-muted-foreground">Fatigue</div>
              <div className="mt-1 font-semibold text-white">{exercise.fatigueScore ?? "--"}/5</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
              <Repeat2 className="h-3.5 w-3.5" />
              Swap: {compactSubstitution(exercise.substitution)}
            </span>
            {exercise.safetyNote ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
                <ShieldAlert className="h-3.5 w-3.5" />
                {compactSafety(exercise.safetyNote)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
