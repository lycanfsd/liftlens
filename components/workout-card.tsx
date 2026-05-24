import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset
} from "lucide-react";

import { ExerciseCard } from "@/components/exercise-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GeneratedWorkout, InputImpact } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";

type CoachPill = {
  label: string;
  tone?: "positive" | "neutral" | "caution" | "accent";
};

function intensityCopy(intensity: GeneratedWorkout["intensity"]) {
  if (intensity === "restore") {
    return {
      title: "Recovery-biased dose",
      copy: "Clean reps, lower fatigue, no max-effort work."
    };
  }

  if (intensity === "push") {
    return {
      title: "Push window",
      copy: "Hard work is available. Progress only inside the RIR target."
    };
  }

  return {
    title: "Productive dose",
    copy: "Enough stimulus to progress without overbuilding the session."
  };
}

function pillTone(tone: CoachPill["tone"] = "neutral") {
  if (tone === "positive") return "border-primary/25 bg-primary/10 text-primary";
  if (tone === "caution") return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  if (tone === "accent") return "border-accent/25 bg-accent/10 text-accent";
  return "border-white/10 bg-white/[0.045] text-muted-foreground";
}

function compactImpact(impact: InputImpact) {
  const signal = impact.signal.toLowerCase();
  const text = `${impact.value} ${impact.effect}`.toLowerCase();

  if (signal.includes("energy")) {
    if (text.includes("reduced")) return "Reduced systemic fatigue";
    if (text.includes("progression")) return "Progression available";
    return "RIR guardrails";
  }

  if (signal.includes("sleep")) {
    if (text.includes("reduced")) return "Lower intensity";
    if (text.includes("normal intensity")) return "Normal intensity";
    return "No max effort";
  }

  if (signal.includes("stress")) {
    if (text.includes("trimmed")) return "Simpler setup";
    if (text.includes("progression")) return "Normal complexity";
    return "Low chaos dose";
  }

  if (signal.includes("soreness")) {
    if (text.includes("reduced") || text.includes("avoided")) return "Direct volume capped";
    return "No soreness cap";
  }

  if (signal.includes("time")) {
    if (text.includes("express")) return "Express dose";
    if (text.includes("supersets")) return "Supersets enabled";
    if (text.includes("full")) return "Accessories allowed";
    return "Standard session";
  }

  if (signal.includes("crowding")) {
    if (text.includes("reduced")) return "Low-wait setup";
    return "Normal equipment";
  }

  if (signal.includes("weak")) {
    if (text.includes("earlier")) return "Weak point priority";
    return "Base priority";
  }

  if (signal.includes("missed")) {
    if (!text.includes("none") && !text.includes("normal")) return "Re-entry dose";
    return "Normal weekly flow";
  }

  if (signal.includes("performance")) {
    if (text.includes("paused")) return "Overload paused";
    if (text.includes("allowed")) return "Overload available";
    return "Conservative progression";
  }

  if (signal.includes("dose")) return `${toTitleCase(impact.value)} dose`;

  return impact.effect.replace(/\.$/, "");
}

function uniquePills(pills: CoachPill[]) {
  const seen = new Set<string>();
  return pills.filter((pill) => {
    const key = pill.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function coachInsightPills(workout: GeneratedWorkout): CoachPill[] {
  const readinessTone =
    workout.readinessLabel === "high" ? "positive" : workout.readinessLabel === "low" ? "caution" : "neutral";
  const volume = workout.volumeMultiplier ? Math.round(workout.volumeMultiplier * 100) : null;
  const priorities = (workout.prioritizedMuscleGroups ?? [workout.focus])
    .slice(0, 2)
    .map((item) => toTitleCase(String(item)))
    .join(" + ");

  return uniquePills([
    workout.readinessScore ? { label: `Readiness ${workout.readinessScore}`, tone: readinessTone } : null,
    workout.trainingDose ? { label: `${toTitleCase(workout.trainingDose)} dose`, tone: readinessTone } : null,
    workout.strategy ? { label: workout.strategy, tone: workout.strategy === "Weak-point priority day" ? "positive" : "accent" } : null,
    priorities ? { label: `${priorities} priority`, tone: "positive" } : null,
    volume && volume !== 100
      ? { label: volume < 100 ? `Volume ${volume}%` : `Volume ${volume}%`, tone: volume < 100 ? "caution" : "positive" }
      : null,
    workout.targetRir ? { label: `RIR ${workout.targetRir}`, tone: "neutral" } : null,
    ...(workout.inputImpacts ?? []).map((impact) => ({
      label: `${impact.signal}: ${compactImpact(impact)}`,
      tone: impact.level
    })),
    workout.aiSummary ? { label: workout.aiSummary.source === "openai" ? "AI-polished read" : "Rule-based read", tone: "accent" } : null
  ].filter(Boolean) as CoachPill[]);
}

function adjustmentDetails(workout: GeneratedWorkout): CoachPill[] {
  const input = workout.inputSnapshot;
  const injuries = input?.injuryAreas?.filter((area) => area !== "none") ?? [];
  const volume = workout.volumeMultiplier ? Math.round(workout.volumeMultiplier * 100) : 100;
  const hasSubstitutions = Boolean(workout.debug?.exerciseSubstitutions.length) || input?.crowding === "packed";
  const significantDose =
    volume <= 85 ||
    volume >= 115 ||
    workout.trainingDose === "low" ||
    workout.trainingDose === "deload" ||
    workout.trainingDose === "high";

  if (!significantDose && injuries.length === 0 && !hasSubstitutions && input?.timeAvailable !== undefined && input.timeAvailable >= 45) {
    return [];
  }

  return uniquePills([
    significantDose ? { label: `Dose adjusted: ${volume}% volume`, tone: volume < 100 ? "caution" : "positive" } : null,
    workout.trainingDose === "deload" ? { label: "Deload rules active", tone: "caution" } : null,
    input?.timeAvailable !== undefined && input.timeAvailable < 30 ? { label: "Highest-value lifts only", tone: "caution" } : null,
    input?.timeAvailable !== undefined && input.timeAvailable >= 30 && input.timeAvailable < 45
      ? { label: "Compressed with supersets", tone: "caution" }
      : null,
    input?.crowding === "packed" ? { label: "Rack dependence reduced", tone: "caution" } : null,
    injuries.length ? { label: `Limitations: ${injuries.map(toTitleCase).join(", ")}`, tone: "caution" } : null,
    workout.explanation?.whatToAvoid.some((item) => item.toLowerCase().includes("sore"))
      ? { label: "Sore muscle volume capped", tone: "caution" }
      : null,
    input?.missedWorkouts && input.missedWorkouts !== "none" ? { label: "Catch-up without punishment volume", tone: "caution" } : null
  ].filter(Boolean) as CoachPill[]);
}

function trainingLogicPills(workout: GeneratedWorkout): CoachPill[] {
  return [
    workout.weeklyVolumeTarget
      ? { label: workout.weeklyVolumeTarget.replace("hard sets / priority muscle / week", "sets / priority / wk"), tone: "neutral" }
      : null,
    workout.progression?.performanceTrend
      ? { label: workout.progression.performanceTrend.replace("Recent performance trend: ", "Trend: ").replace(/\.$/, ""), tone: "accent" }
      : null,
    workout.progression?.recoveryTrend
      ? { label: workout.progression.recoveryTrend.replace("Recovery trend: ", "Recovery: ").replace(/\.$/, ""), tone: "neutral" }
      : null,
    workout.deload?.active ? { label: "Deload trigger active", tone: "caution" } : null,
    workout.progression?.adherence
      ? { label: workout.progression.adherence.replace(" of weekly target completed", " weekly target"), tone: "neutral" }
      : null
  ].filter(Boolean) as CoachPill[];
}

function guardrailPills(workout: GeneratedWorkout): CoachPill[] {
  const source = [...(workout.notes ?? []), ...(workout.explanation?.safety ?? [])].join(" ").toLowerCase();
  return uniquePills([
    { label: "No daily max effort", tone: "neutral" },
    workout.targetRir ? { label: `Stop at RIR ${workout.targetRir}`, tone: "neutral" } : null,
    source.includes("pain-free") || source.includes("injury") ? { label: "Pain-free range only", tone: "caution" } : null,
    source.includes("superset") ? { label: "Superset only if quality holds", tone: "accent" } : null,
    { label: "Not medical advice", tone: "neutral" }
  ].filter(Boolean) as CoachPill[]);
}

function CoachPills({ pills }: { pills: CoachPill[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold leading-none ${pillTone(pill.tone)}`}
        >
          {pill.label}
        </span>
      ))}
    </div>
  );
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
  const showDebug = process.env.NODE_ENV !== "production" && workout.debug;
  const insights = coachInsightPills(workout);
  const details = adjustmentDetails(workout);
  const logic = trainingLogicPills(workout);
  const guardrails = guardrailPills(workout);

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
            {workout.trainingDose ? <Badge>Dose: {toTitleCase(workout.trainingDose)}</Badge> : null}
            {workout.strategy ? <Badge>{workout.strategy}</Badge> : null}
            <Badge>{toTitleCase(workout.focus)}</Badge>
            {workout.trainingGoal ? <Badge>{toTitleCase(workout.trainingGoal)}</Badge> : null}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="text-sm font-semibold text-primary">{strategy.title}</p>
              <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{workout.name}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{strategy.copy}</p>
              {workout.aiSummary ? (
                <div className="mt-4">
                  <CoachPills
                    pills={[
                      {
                        label: workout.aiSummary.source === "openai" ? "Coach language refined" : "Deterministic coaching active",
                        tone: "accent"
                      }
                    ]}
                  />
                </div>
              ) : null}
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
                  Readiness
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{workout.readinessScore ?? "--"}/100</p>
                <p className="mt-1 text-xs text-muted-foreground">{workout.readinessLabel ?? "adaptive"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Dose
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{toTitleCase(workout.trainingDose ?? "steady")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  RIR {workout.targetRir ?? 2} / RPE {workout.targetRpe ?? 8}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4 text-accent" />
                  Priority
                </div>
                <p className="mt-2 text-xl font-semibold text-white">
                  {(workout.prioritizedMuscleGroups ?? [workout.focus])
                    .slice(0, 2)
                    .map((item) => toTitleCase(String(item)))
                    .join(" + ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {workout.volumeMultiplier ? `${Math.round(workout.volumeMultiplier * 100)}% volume` : "adaptive volume"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {insights.length ? (
          <section className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <Gauge className="h-4 w-4 text-primary" />
                  Coach insights
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Fast signals. No lecture.</p>
              </div>
            </div>
            <div className="mt-4">
              <CoachPills pills={insights} />
            </div>
          </section>
        ) : null}

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

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <TimerReset className="h-4 w-4 text-accent" />
                Express fallback
              </h3>
              <div className="mt-4 space-y-2">
                {workout.condensed.map((step) => (
                  <div key={step} className="rounded-xl bg-black/25 px-3 py-2 text-sm text-muted-foreground">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {workout.cooldown?.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Cooldown
                </h3>
                <div className="mt-4 space-y-2">
                  {workout.cooldown.map((item, index) => (
                    <div key={item} className="flex gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-white">{index + 1}</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {logic.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Training logic
                </h3>
                <div className="mt-4">
                  <CoachPills pills={logic} />
                </div>
              </div>
            ) : null}
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
          {details.length ? (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Sparkles className="h-4 w-4 text-accent" />
                Adjustments applied
              </h3>
              <div className="mt-4">
                <CoachPills pills={details} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="font-semibold text-white">Coach guardrails</h3>
              <div className="mt-4">
                <CoachPills pills={guardrails} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Completion standard
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Clean reps. Log one note. Leave while quality is high.</p>
              {onSave ? (
                <Button onClick={onSave} disabled={saving} className="mt-4 w-full">
                  {saving ? "Saving..." : saveLabel}
                </Button>
              ) : null}
              {message ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
            </div>
          </div>

          {showDebug ? (
            <details className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-accent">Development debug: engine decision trace</summary>
              <div className="mt-4 grid gap-3 text-xs leading-5 text-muted-foreground lg:grid-cols-2">
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="font-semibold text-white">Readiness calculation</p>
                  {workout.debug?.readinessCalculation.map((line) => <p key={line}>{line}</p>)}
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="font-semibold text-white">Volume multiplier</p>
                  <p>{Math.round((workout.debug?.volumeMultiplier ?? 1) * 100)}%</p>
                  <p className="mt-2 font-semibold text-white">Selected priorities</p>
                  <p>{workout.debug?.selectedPriorities.join(", ") || "None"}</p>
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="font-semibold text-white">Substitutions</p>
                  {(workout.debug?.exerciseSubstitutions.length ? workout.debug.exerciseSubstitutions : ["No forced substitutions."]).map(
                    (line) => <p key={line}>{line}</p>
                  )}
                </div>
                <div className="rounded-xl bg-black/25 p-3">
                  <p className="font-semibold text-white">Avoided exercises</p>
                  {(workout.debug?.avoidedExercises.length ? workout.debug.avoidedExercises : ["No exclusions triggered."]).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
