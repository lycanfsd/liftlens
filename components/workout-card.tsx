import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Gauge,
  ListChecks,
  PlayCircle,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ExerciseCard } from "@/components/exercise-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DailyWorkoutStatus, GeneratedWorkout, InputImpact } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";

export type WorkoutViewMode = "simple" | "advanced";

type CoachPill = {
  label: string;
  tone?: "positive" | "neutral" | "caution" | "accent";
};

type PlanSignal = {
  label: string;
  value: string;
  tone: "positive" | "neutral" | "caution" | "accent";
  priority: number;
};

function intensityCopy(intensity: GeneratedWorkout["intensity"]) {
  if (intensity === "restore") {
    return {
      title: "Recovery-biased dose",
      copy: "Lower fatigue today. Quality over load."
    };
  }

  if (intensity === "push") {
    return {
      title: "Push window",
      copy: "Use the first lifts for progress. Stop before reps grind."
    };
  }

  return {
    title: "Productive dose",
    copy: "Train hard enough to move forward. Keep the session clean."
  };
}

function intensityLabel(workout: GeneratedWorkout) {
  if (workout.trainingDose === "deload") return "Recovery";
  if (workout.trainingDose === "low" || workout.intensity === "restore") return "Light";
  if (workout.trainingDose === "high" || workout.intensity === "push") return "Hard";
  return "Moderate";
}

function intensityTone(workout: GeneratedWorkout): CoachPill["tone"] {
  const label = intensityLabel(workout);
  if (label === "Hard") return "positive";
  if (label === "Light" || label === "Recovery") return "caution";
  return "accent";
}

function pillTone(tone: CoachPill["tone"] = "neutral") {
  if (tone === "positive") return "border-primary/25 bg-primary/10 text-primary";
  if (tone === "caution") return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  if (tone === "accent") return "border-accent/25 bg-accent/10 text-accent";
  return "border-white/10 bg-white/[0.045] text-muted-foreground";
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

function compactImpact(impact: InputImpact) {
  const signal = impact.signal.toLowerCase();
  const text = `${impact.value} ${impact.effect}`.toLowerCase();

  if (signal.includes("energy")) {
    if (text.includes("reduced")) return "reduced fatigue";
    if (text.includes("progression")) return "harder first sets";
    return "steady effort";
  }

  if (signal.includes("sleep")) {
    if (text.includes("reduced")) return "intensity reduced";
    if (text.includes("normal intensity")) return "normal intensity";
    return "no max effort";
  }

  if (signal.includes("stress")) {
    if (text.includes("trimmed")) return "simpler setup";
    if (text.includes("progression")) return "normal complexity";
    return "lower chaos";
  }

  if (signal.includes("soreness")) {
    if (text.includes("reduced") || text.includes("avoided")) return "direct volume reduced";
    return "normal volume";
  }

  if (signal.includes("time")) {
    if (text.includes("express")) return "shorter session";
    if (text.includes("supersets")) return "compressed session";
    if (text.includes("full")) return "accessories added";
    return "standard session";
  }

  if (signal.includes("crowding")) {
    if (text.includes("reduced")) return "easier setup exercises";
    return "normal equipment";
  }

  if (signal.includes("weak")) {
    if (text.includes("earlier")) return "priority work early";
    return "base priority";
  }

  if (signal.includes("missed")) {
    if (!text.includes("none") && !text.includes("normal")) return "realistic re-entry";
    return "normal weekly flow";
  }

  if (signal.includes("performance")) {
    if (text.includes("paused")) return "overload paused";
    if (text.includes("allowed")) return "progression available";
    return "conservative progression";
  }

  if (signal.includes("momentum")) {
    if (text.includes("shortened")) return "friction reduced";
    if (text.includes("progression")) return "progression available";
    return "trajectory maintained";
  }

  if (signal.includes("dose")) return `${toTitleCase(impact.value)} intensity`;

  return impact.effect.replace(/\.$/, "");
}

function meaningfulSignal(impact: InputImpact): PlanSignal | null {
  const signal = impact.signal.toLowerCase();
  const text = `${impact.value} ${impact.effect}`.toLowerCase();

  if (impact.level === "neutral") return null;
  if (text.includes("no extra") || text.includes("normal weekly flow") || text.includes("normal equipment")) return null;
  if (signal.includes("training dose")) return null;

  if (signal.includes("energy")) {
    return {
      label: impact.value.startsWith("1") || impact.value.startsWith("2") ? "Low energy" : "High energy",
      value: compactImpact(impact),
      tone: impact.level,
      priority: impact.level === "caution" ? 5 : 3
    };
  }

  if (signal.includes("sleep")) {
    return {
      label: impact.value.startsWith("1") || impact.value.startsWith("2") ? "Low sleep" : "Sleep ready",
      value: compactImpact(impact),
      tone: impact.level,
      priority: impact.level === "caution" ? 5 : 2
    };
  }

  if (signal.includes("stress")) {
    return {
      label: impact.value.startsWith("4") || impact.value.startsWith("5") ? "High stress" : "Low stress",
      value: compactImpact(impact),
      tone: impact.level,
      priority: impact.level === "caution" ? 4 : 2
    };
  }

  if (signal.includes("soreness")) {
    return {
      label: `${impact.value} soreness`,
      value: compactImpact(impact),
      tone: impact.level,
      priority: 5
    };
  }

  if (signal.includes("time")) {
    if (!text.includes("express") && !text.includes("supersets") && !text.includes("full")) return null;
    return {
      label: impact.value,
      value: compactImpact(impact),
      tone: impact.level,
      priority: text.includes("express") ? 5 : 4
    };
  }

  if (signal.includes("crowding")) {
    if (!text.includes("reduced")) return null;
    return {
      label: `${impact.value} gym`,
      value: compactImpact(impact),
      tone: impact.level,
      priority: 4
    };
  }

  if (signal.includes("weak")) {
    if (!text.includes("earlier")) return null;
    return {
      label: `${impact.value} focus`,
      value: compactImpact(impact),
      tone: "positive",
      priority: 3
    };
  }

  if (signal.includes("missed")) {
    if (impact.value.toLowerCase() === "none") return null;
    return {
      label: "Missed sessions",
      value: compactImpact(impact),
      tone: impact.level,
      priority: 4
    };
  }

  if (signal.includes("performance")) {
    return {
      label: impact.value,
      value: compactImpact(impact),
      tone: impact.level,
      priority: impact.level === "caution" ? 4 : 2
    };
  }

  if (signal.includes("momentum")) {
    return {
      label: impact.value.includes("At Risk") ? "Momentum at risk" : impact.value,
      value: compactImpact(impact),
      tone: impact.level,
      priority: impact.level === "caution" ? 5 : 3
    };
  }

  return null;
}

function shapedPlanCards(workout: GeneratedWorkout) {
  const seen = new Set<string>();
  return (workout.inputImpacts ?? [])
    .map(meaningfulSignal)
    .filter((signal): signal is PlanSignal => Boolean(signal))
    .sort((a, b) => b.priority - a.priority)
    .filter((signal) => {
      const key = `${signal.label}-${signal.value}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4) as PlanSignal[];
}

function mainFocus(workout: GeneratedWorkout) {
  return (workout.prioritizedMuscleGroups ?? [workout.focus])
    .slice(0, 2)
    .map((item) => toTitleCase(String(item)))
    .join(" + ");
}

function coachNote(workout: GeneratedWorkout) {
  const strategy = intensityCopy(workout.intensity);
  const input = workout.inputSnapshot;

  if (workout.deload?.active) return "Back off volume. Leave feeling better than you arrived.";
  if (input?.injuryAreas?.length) return "Use pain-free ranges only. Swap anything that changes your mechanics.";
  if (input?.crowding === "packed") return "Keep setup simple. Skip waits.";
  if (input?.timeAvailable !== undefined && input.timeAvailable < 30) return "Hit the highest-value work first.";
  if ((workout.readinessScore ?? 70) < 55) return "Lower fatigue today. Protect the rhythm.";
  if ((workout.readinessScore ?? 70) >= 78) return "Progress is available if reps stay crisp.";
  return strategy.copy;
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
    significantDose ? { label: `Volume ${volume}%`, tone: volume < 100 ? "caution" : "positive" } : null,
    workout.trainingDose === "deload" ? { label: "Recovery adjustment active", tone: "caution" } : null,
    input?.timeAvailable !== undefined && input.timeAvailable < 30 ? { label: "Highest-value lifts only", tone: "caution" } : null,
    input?.timeAvailable !== undefined && input.timeAvailable >= 30 && input.timeAvailable < 45
      ? { label: "Supersets enabled", tone: "caution" }
      : null,
    input?.crowding === "packed" ? { label: "Rack dependence reduced", tone: "caution" } : null,
    injuries.length ? { label: `Protected: ${injuries.map(toTitleCase).join(", ")}`, tone: "caution" } : null,
    workout.explanation?.whatToAvoid.some((item) => item.toLowerCase().includes("sore"))
      ? { label: "Sore muscle volume capped", tone: "caution" }
      : null,
    input?.missedWorkouts && input.missedWorkouts !== "none" ? { label: "No punishment volume", tone: "caution" } : null
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
    workout.targetRir ? { label: `Leave ${workout.targetRir} reps in reserve`, tone: "neutral" } : null,
    source.includes("pain-free") || source.includes("injury") ? { label: "Pain-free range only", tone: "caution" } : null,
    source.includes("superset") ? { label: "Quality before speed", tone: "accent" } : null,
    { label: "Not medical advice", tone: "neutral" }
  ].filter(Boolean) as CoachPill[]);
}

function compactSubstitution(substitution: string) {
  return substitution
    .replace(/\s+if equipment or comfort changes\.$/, "")
    .replace(/\s+if waiting would break flow\.$/, "")
    .replace(/\.$/, "");
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

function DetailSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-white/10 bg-white/[0.035]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.035]">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/10 p-4">{children}</div>
    </details>
  );
}

export function WorkoutCard({
  workout,
  onStart,
  onComplete,
  onSave,
  onInstructionOpen,
  saveLabel = "Complete workout",
  saving = false,
  message,
  viewMode = "simple",
  status = "planned"
}: {
  workout: GeneratedWorkout;
  onStart?: () => void;
  onComplete?: () => void;
  onSave?: () => void;
  onInstructionOpen?: () => void;
  saveLabel?: string;
  saving?: boolean;
  message?: string;
  viewMode?: WorkoutViewMode;
  status?: DailyWorkoutStatus;
}) {
  const advanced = viewMode === "advanced";
  const planCards = shapedPlanCards(workout);
  const details = adjustmentDetails(workout);
  const logic = trainingLogicPills(workout);
  const guardrails = guardrailPills(workout);
  const showDebug = process.env.NODE_ENV !== "production" && workout.debug;
  const startLabel = status === "completed" ? "Completed" : status === "started" ? "Workout started" : "Start workout";
  const completeLabel = status === "completed" ? "Completed" : saveLabel;

  if (!workout.exercises.length) {
    return (
      <Card className="border-white/10 bg-white/[0.035]">
        <CardContent className="p-6">
          <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">Plan needs a refresh</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-white">Let&apos;s rebuild today&apos;s workout.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The current plan is missing exercise data. No stress. Regenerate the session and LiftLens will rebuild it from your latest inputs.
          </p>
          <Button asChild className="mt-5">
            <a href="/workout">Regenerate workout</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03]">
      <CardContent className="p-0">
        <section className="border-b border-white/10 p-5 sm:p-7">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Today&apos;s plan
          </Badge>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="text-sm font-semibold text-primary">{intensityCopy(workout.intensity).title}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">{workout.name}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{coachNote(workout)}</p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={onStart}
                  disabled={saving || status === "completed"}
                >
                  <PlayCircle className="h-4 w-4" />
                  {startLabel}
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                  {workout.exercises.length} exercises - leave {workout.targetRir ?? 2} reps in reserve
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-accent" />
                  Duration
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{workout.duration} min</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gauge className="h-4 w-4 text-primary" />
                  Today&apos;s intensity
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{intensityLabel(workout)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4 text-accent" />
                  Focus
                </div>
                <p className="mt-2 text-xl font-semibold text-white">{mainFocus(workout)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Readiness
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{workout.readinessScore ?? "--"}/100</p>
              </div>
            </div>
          </div>
        </section>

        {planCards.length ? (
          <section className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">What changed today</h3>
                <p className="mt-1 text-sm text-muted-foreground">Only the signals that changed the workout.</p>
              </div>
              <Badge className={pillTone(intensityTone(workout))}>{intensityLabel(workout)}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {planCards.map((card) => (
                <div key={`${card.label}-${card.value}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section id="workout-main" className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Exercise plan</h3>
              <p className="mt-1 text-sm text-muted-foreground">Follow the order. The first lifts matter most.</p>
            </div>
            <Badge>{workout.exercises.length} moves</Badge>
          </div>
          <div className="space-y-3">
            {workout.exercises.map((exercise, index) => (
              <ExerciseCard
                key={`${exercise.name}-${index}`}
                exercise={exercise}
                index={index}
                advanced={advanced}
                onInstructionOpen={onInstructionOpen}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 p-5 sm:p-6">
          <div className="grid gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Advanced details</h3>
              <p className="mt-1 text-sm text-muted-foreground">Open these only when you want the deeper coach logic.</p>
            </div>
            <DetailSection title="Warmup and cooldown" icon={ListChecks} defaultOpen={advanced}>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-white">Warmup</h4>
                  <div className="mt-3 space-y-2">
                    {workout.warmup.map((item, index) => (
                      <div key={item} className="flex gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-muted-foreground">
                        <span className="font-semibold text-white">{index + 1}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                {workout.cooldown?.length ? (
                  <div>
                    <h4 className="text-sm font-semibold text-white">Cooldown</h4>
                    <div className="mt-3 space-y-2">
                      {workout.cooldown.map((item, index) => (
                        <div key={item} className="flex gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-white">{index + 1}</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </DetailSection>

            <DetailSection title="Why this workout?" icon={Sparkles} defaultOpen={advanced}>
              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {workout.explanation?.whyThisWorkout ?? workout.todayStrategy ?? intensityCopy(workout.intensity).copy}
                </p>
                {details.length ? <CoachPills pills={details} /> : null}
              </div>
            </DetailSection>

            <DetailSection title="What changed from your inputs?" icon={Gauge} defaultOpen={advanced}>
              <div className="grid gap-2 sm:grid-cols-2">
                {(workout.inputImpacts ?? []).map((impact) => (
                  <div key={impact.signal} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-semibold text-white">
                      {impact.signal}: <span className="text-muted-foreground">{impact.value}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{compactImpact(impact)}</p>
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Advanced exercise metrics" icon={BarChart3} defaultOpen={advanced}>
              <div className="grid gap-2">
                {workout.exercises.map((exercise) => (
                  <div key={exercise.name} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs sm:grid-cols-4">
                    <p className="font-semibold text-white sm:col-span-1">{exercise.name}</p>
                    <p className="text-muted-foreground">
                      Efficiency: <span className="font-semibold text-white">{exercise.stimulusToFatigue ?? "--"}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Fatigue: <span className="font-semibold text-white">{exercise.fatigueScore ?? "--"}/5</span>
                    </p>
                    <p className="text-muted-foreground">
                      Tempo: <span className="font-semibold text-white">{exercise.tempo ?? "Controlled"}</span>
                    </p>
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Substitutions" icon={Repeat2} defaultOpen={advanced}>
              <div className="grid gap-2">
                {workout.exercises.map((exercise) => (
                  <div key={exercise.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-semibold text-white">{exercise.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Swap: {compactSubstitution(exercise.substitution)}</p>
                    {exercise.safetyNote ? <p className="mt-2 text-xs text-amber-100">{exercise.safetyNote}</p> : null}
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Recovery notes" icon={ShieldCheck} defaultOpen={advanced}>
              <div className="space-y-4">
                <CoachPills pills={guardrails} />
                {workout.explanation?.whatToAvoid.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {workout.explanation.whatToAvoid.map((item) => (
                      <p key={item} className="rounded-xl bg-black/25 p-3 text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </DetailSection>

            <DetailSection title="Programming logic" icon={TimerReset} defaultOpen={advanced}>
              <div className="space-y-4">
                {logic.length ? <CoachPills pills={logic} /> : null}
                {workout.progression ? (
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p className="rounded-xl bg-black/25 p-3">{workout.progression.estimatedOneRepMax}</p>
                    <p className="rounded-xl bg-black/25 p-3">{workout.progression.weeklyVolume}</p>
                  </div>
                ) : null}
                {workout.explanation?.progressNextTime ? (
                  <p className="rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">{workout.explanation.progressNextTime}</p>
                ) : null}

                {showDebug ? (
                  <details className="rounded-xl border border-accent/20 bg-accent/10 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-accent">Development decision trace</summary>
                    <div className="mt-3 grid gap-3 text-xs leading-5 text-muted-foreground lg:grid-cols-2">
                      <div className="rounded-xl bg-black/25 p-3">
                        <p className="font-semibold text-white">Readiness breakdown</p>
                        {workout.debug?.readinessCalculation.map((line) => <p key={line}>{line}</p>)}
                      </div>
                      <div className="rounded-xl bg-black/25 p-3">
                        <p className="font-semibold text-white">Recovery adjustment</p>
                        <p>{Math.round((workout.debug?.volumeMultiplier ?? 1) * 100)}% volume</p>
                        <p className="mt-2 font-semibold text-white">Priorities</p>
                        <p>{workout.debug?.selectedPriorities.join(", ") || "None"}</p>
                      </div>
                      <div className="rounded-xl bg-black/25 p-3">
                        <p className="font-semibold text-white">Substitution trace</p>
                        {(workout.debug?.exerciseSubstitutions.length ? workout.debug.exerciseSubstitutions : ["No forced substitutions."]).map(
                          (line) => <p key={line}>{line}</p>
                        )}
                      </div>
                      <div className="rounded-xl bg-black/25 p-3">
                        <p className="font-semibold text-white">Avoided exercises</p>
                        {(workout.debug?.avoidedExercises.length ? workout.debug.avoidedExercises : ["No exclusions triggered."]).map(
                          (line) => (
                            <p key={line}>{line}</p>
                          )
                        )}
                      </div>
                    </div>
                  </details>
                ) : null}
              </div>
            </DetailSection>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-center">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Completion standard
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Clean reps. One note. Stop while quality is high.</p>
                {message ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p> : null}
              </div>
              {onComplete || onSave ? (
                <Button
                  data-tour="complete-workout"
                  onClick={onComplete ?? onSave}
                  disabled={saving || status === "completed"}
                  className="w-full"
                >
                  {saving ? "Saving..." : completeLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
