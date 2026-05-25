"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  BatteryMedium,
  Bed,
  Brain,
  Clock3,
  MapPin,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  WandSparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { generateAdaptiveWorkoutAction, saveWorkoutAction } from "@/app/app-actions";
import { WorkoutCard, type WorkoutViewMode } from "@/components/workout-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bodyFocusOptions,
  crowdingOptions,
  discomfortOptions,
  equipmentOptions,
  missedWorkoutOptions,
  preferredSplitOptions,
  programPhaseOptions,
  weakPoints
} from "@/lib/constants";
import type {
  BodyFocus,
  DailyCheckIn,
  DiscomfortArea,
  EquipmentAccess,
  GeneratedWorkout,
  GymCrowding,
  MissedWorkoutWindow,
  PreferredSplit,
  ProgramPhase,
  WeakPoint
} from "@/lib/types";
import { generateWorkout, type WorkoutEngineContext } from "@/lib/workout/generator";
import { cn } from "@/lib/utils";

const sorenessMuscles: WeakPoint[] = ["chest", "shoulders", "back", "legs", "glutes", "core"];

const defaultInput: DailyCheckIn = {
  timeAvailable: 35,
  energy: 3,
  soreness: 2,
  sleepQuality: 3,
  stressLevel: 3,
  equipment: "full-gym",
  crowding: "moderate",
  bodyFocus: "auto",
  missedWorkouts: "none",
  discomfortArea: "none",
  sorenessByMuscle: {
    chest: 2,
    shoulders: 2,
    arms: 2,
    back: 2,
    legs: 2,
    glutes: 2,
    core: 2,
    conditioning: 2
  },
  injuryAreas: [],
  preferredSplit: "auto",
  currentProgramPhase: "build",
  dislikedExercises: []
};

function withGlobalSoreness(input: DailyCheckIn, soreness: number): DailyCheckIn {
  return {
    ...input,
    soreness,
    sorenessByMuscle: {
      chest: soreness,
      shoulders: soreness,
      arms: soreness,
      back: soreness,
      legs: soreness,
      glutes: soreness,
      core: soreness,
      conditioning: soreness
    }
  };
}

const realities: { label: string; copy: string; input: DailyCheckIn }[] = [
  {
    label: "Calendar squeezed",
    copy: "20 min, enough to count",
    input: { ...defaultInput, timeAvailable: 20, energy: 3, bodyFocus: "full-body" }
  },
  {
    label: "Low battery",
    copy: "Keep the streak alive",
    input: withGlobalSoreness(
      { ...defaultInput, timeAvailable: 25, energy: 2, sleepQuality: 2, stressLevel: 4, bodyFocus: "upper" },
      3
    )
  },
  {
    label: "Packed gym",
    copy: "One-corner substitutions",
    input: { ...defaultInput, crowding: "packed", equipment: "dumbbells-only", bodyFocus: "full-body" }
  },
  {
    label: "Ready to push",
    copy: "More output, still controlled",
    input: withGlobalSoreness(
      { ...defaultInput, timeAvailable: 55, energy: 5, sleepQuality: 5, stressLevel: 1, bodyFocus: "full-body" },
      1
    )
  },
  {
    label: "Missed week",
    copy: "No guilt re-entry dose",
    input: { ...defaultInput, timeAvailable: 30, energy: 3, soreness: 2, missedWorkouts: "1-week-plus", currentProgramPhase: "return" }
  }
];

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-950">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SignalSlider({
  icon: Icon,
  label,
  value,
  tone,
  onChange
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "green" | "blue";
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", tone === "green" ? "text-primary" : "text-accent")} />
          <Label>{label}</Label>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn("mt-5 w-full", tone === "green" ? "accent-primary" : "accent-cyan-300")}
      />
    </div>
  );
}

function getTradeoffCopy(input: DailyCheckIn) {
  if (input.crowding === "packed") {
    return "This version avoids machine bottlenecks and keeps substitutions close.";
  }
  if (input.missedWorkouts !== "none") {
    return "This version uses re-entry logic: no punishment volume, just a dose you can recover from.";
  }
  if (input.discomfortArea !== "none") {
    return "This version favors swaps that keep the target area from changing your mechanics.";
  }
  if (input.energy <= 2) {
    return "This version keeps the habit alive without pretending you are fully charged.";
  }
  return "This version balances progress with enough flexibility to actually start.";
}

function MuscleSorenessGrid({
  soreness,
  onChange
}: {
  soreness: DailyCheckIn["sorenessByMuscle"];
  onChange: (muscle: WeakPoint, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Muscle soreness map</Label>
          <p className="mt-1 text-xs text-muted-foreground">High soreness reduces or removes direct volume.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sorenessMuscles.map((muscle) => (
          <div key={muscle} className="rounded-xl bg-black/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                {weakPoints.find((point) => point.value === muscle)?.label ?? muscle}
              </span>
              <span className="text-xs text-muted-foreground">{soreness[muscle] ?? 2}/5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={soreness[muscle] ?? 2}
              onChange={(event) => onChange(muscle, Number(event.target.value))}
              className="mt-2 w-full accent-cyan-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function InjuryAreaButtons({
  value,
  onChange
}: {
  value: DiscomfortArea[];
  onChange: (value: DiscomfortArea[]) => void;
}) {
  function toggle(area: WeakPoint) {
    onChange(value.includes(area) ? value.filter((item) => item !== area) : [...value, area]);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <Label>Limitations to protect</Label>
      <p className="mt-1 text-xs text-muted-foreground">These remove risky movements and add safer swaps.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["shoulders", "back", "legs", "glutes", "chest", "arms"] as WeakPoint[]).map((area) => {
          const selected = value.includes(area);
          return (
            <button
              key={area}
              type="button"
              onClick={() => toggle(area)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                selected
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {weakPoints.find((point) => point.value === area)?.label ?? area}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkoutGenerator({ engineContext }: { engineContext?: Partial<WorkoutEngineContext> }) {
  const [input, setInput] = useState<DailyCheckIn>(defaultInput);
  const [workout, setWorkout] = useState<GeneratedWorkout>(() => generateWorkout(defaultInput, engineContext));
  const [message, setMessage] = useState("Generated from a balanced default day. Adjust signals when life changes.");
  const [viewMode, setViewMode] = useState<WorkoutViewMode>("simple");
  const [isPending, startTransition] = useTransition();

  const fitScore = useMemo(() => {
    const preview = generateWorkout(input, engineContext);
    return preview.readinessScore ?? 70;
  }, [engineContext, input]);

  const coachRead = useMemo(() => {
    if (input.energy <= 2) return "Minimum effective dose";
    if (input.missedWorkouts === "1-week-plus") return "Deload re-entry";
    if (input.soreness >= 4) return "Recovery-aware session";
    if (input.crowding === "packed") return "Low-wait gym strategy";
    if (input.energy >= 4 && input.timeAvailable >= 40) return "Productive push";
    return "Science-based steady dose";
  }, [input]);

  function updateInput<T extends keyof DailyCheckIn>(key: T, value: DailyCheckIn[T]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateMuscleSoreness(muscle: WeakPoint, value: number) {
    setInput((current) => {
      const nextSoreness = { ...current.sorenessByMuscle, [muscle]: value };
      const values = sorenessMuscles.map((item) => nextSoreness[item] ?? current.soreness);
      const average = Math.round(values.reduce((sum, item) => sum + item, 0) / values.length);
      return {
        ...current,
        soreness: average,
        sorenessByMuscle: nextSoreness
      };
    });
  }

  function updateGlobalSoreness(value: number) {
    setInput((current) => ({
      ...current,
      soreness: value,
      sorenessByMuscle: {
        chest: value,
        shoulders: value,
        arms: value,
        back: value,
        legs: value,
        glutes: value,
        core: value,
        conditioning: value
      }
    }));
  }

  function applyReality(nextInput: DailyCheckIn) {
    setInput(nextInput);
    const nextWorkout = generateWorkout(nextInput, engineContext);
    setWorkout(nextWorkout);
    setMessage("Reality applied. The workout changed before your motivation had to negotiate.");
  }

  function generate() {
    const next = generateWorkout(input, engineContext);
    setWorkout(next);
    setMessage("Building the server-side training dose from today's inputs.");

    startTransition(async () => {
      const result = await generateAdaptiveWorkoutAction(input, engineContext);
      setWorkout(result.workout);
      setMessage(result.message);
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveWorkoutAction(workout, input);
      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="space-y-4 xl:sticky xl:top-8 xl:h-fit">
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/12 via-white/[0.05] to-accent/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <WandSparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold">Training engine</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">{coachRead}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Deterministic logic first: goal, recovery, volume, RIR, equipment, and fatigue.
                </p>
              </div>
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/35">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-white">{fitScore}</div>
                  <div className="text-[11px] text-muted-foreground">fit score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h3 className="text-lg font-semibold text-white">Quick realities</h3>
              <p className="mt-1 text-sm text-muted-foreground">Tap the situation. The plan adapts immediately.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {realities.map((reality) => (
                <button
                  key={reality.label}
                  type="button"
                  onClick={() => applyReality(reality.input)}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-primary/45 hover:bg-white/[0.06]"
                >
                  <span className="block font-semibold text-white">{reality.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{reality.copy}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h3 className="text-lg font-semibold text-white">Today&apos;s constraints</h3>
              <p className="mt-1 text-sm text-muted-foreground">The workout is only premium if it respects the day.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <Label htmlFor="timeAvailable">Time available</Label>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                  {input.timeAvailable} min
                </span>
              </div>
              <Input
                id="timeAvailable"
                type="number"
                min={10}
                max={90}
                value={input.timeAvailable}
                onChange={(event) => updateInput("timeAvailable", Number(event.target.value))}
              />
              <input
                type="range"
                min={10}
                max={90}
                value={input.timeAvailable}
                onChange={(event) => updateInput("timeAvailable", Number(event.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <SignalSlider
              icon={BatteryMedium}
              label="Energy"
              value={input.energy}
              tone="green"
              onChange={(value) => updateInput("energy", value)}
            />
            <SignalSlider
              icon={Activity}
              label="Soreness"
              value={input.soreness}
              tone="blue"
              onChange={updateGlobalSoreness}
            />
            <SignalSlider
              icon={Bed}
              label="Sleep quality"
              value={input.sleepQuality}
              tone="green"
              onChange={(value) => updateInput("sleepQuality", value)}
            />
            <SignalSlider
              icon={Brain}
              label="Stress"
              value={input.stressLevel}
              tone="blue"
              onChange={(value) => updateInput("stressLevel", value)}
            />

            <MuscleSorenessGrid soreness={input.sorenessByMuscle} onChange={updateMuscleSoreness} />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField<EquipmentAccess>
                label="Equipment"
                value={input.equipment}
                options={equipmentOptions}
                onChange={(value) => updateInput("equipment", value)}
              />
              <SelectField<GymCrowding>
                label="Gym crowding"
                value={input.crowding}
                options={crowdingOptions}
                onChange={(value) => updateInput("crowding", value)}
              />
            </div>
            <SelectField<BodyFocus>
              label="Body focus"
              value={input.bodyFocus}
              options={bodyFocusOptions}
                onChange={(value) => updateInput("bodyFocus", value)}
              />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField<PreferredSplit>
                label="Preferred split"
                value={input.preferredSplit}
                options={preferredSplitOptions}
                onChange={(value) => updateInput("preferredSplit", value)}
              />
              <SelectField<ProgramPhase>
                label="Program phase"
                value={input.currentProgramPhase}
                options={programPhaseOptions}
                onChange={(value) => updateInput("currentProgramPhase", value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField<MissedWorkoutWindow>
                label="Missed workouts"
                value={input.missedWorkouts}
                options={missedWorkoutOptions}
                onChange={(value) => updateInput("missedWorkouts", value)}
              />
              <SelectField<DiscomfortArea>
                label="Discomfort to avoid"
                value={input.discomfortArea}
                options={discomfortOptions}
                onChange={(value) => updateInput("discomfortArea", value)}
              />
            </div>
            <InjuryAreaButtons value={input.injuryAreas} onChange={(value) => updateInput("injuryAreas", value)} />

            <div className="grid gap-2">
              <Label htmlFor="dislikedExercises">Exercises to avoid today</Label>
              <Input
                id="dislikedExercises"
                placeholder="Example: squats, pull-ups, bench"
                value={input.dislikedExercises.join(", ")}
                onChange={(event) =>
                  updateInput(
                    "dislikedExercises",
                    event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="h-4 w-4 text-accent" />
                Plan tradeoff
              </div>
              {getTradeoffCopy(input)}
            </div>

            <div className="grid gap-2 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-xs leading-5 text-primary">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Recovery guardrails
              </div>
              <span>Target: RIR {workout.targetRir ?? 2} / RPE {workout.targetRpe ?? 8}</span>
              <span>Recovery score: {workout.recoveryScore ?? "--"}/100</span>
              <span>Dose: {workout.trainingDose ?? workout.intensity}</span>
              <span>Deload: {workout.deload?.active ? "Active" : "Not needed"}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={generate}>
                <WandSparkles className="h-4 w-4" />
                Adapt workout
              </Button>
              <Button variant="outline" onClick={() => applyReality(defaultInput)}>
                <RotateCcw className="h-4 w-4" />
                Reset day
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <Card className="border-white/10 bg-white/[0.035]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Workout view</p>
                <p className="text-xs text-muted-foreground">
                  Simple is the clean coaching view. Advanced opens the engine details.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
              {(["simple", "advanced"] as WorkoutViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    viewMode === mode ? "bg-primary text-primary-foreground shadow-green" : "text-muted-foreground hover:text-white"
                  )}
                >
                  {mode === "simple" ? "Simple" : "Advanced"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <WorkoutCard workout={workout} onSave={save} saving={isPending} message={message} viewMode={viewMode} />
      </section>
    </div>
  );
}
