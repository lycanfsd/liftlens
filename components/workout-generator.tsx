"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  BatteryMedium,
  Bed,
  Brain,
  ChevronDown,
  Clock3,
  MapPin,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  WandSparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  generateAdaptiveWorkoutAction,
  saveWorkoutAction,
  updateDailyWorkoutStatusAction
} from "@/app/app-actions";
import { CompletedTodayBanner, CompletionSuccessModal } from "@/components/workout-completion-celebration";
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
  DailyWorkoutRecord,
  DiscomfortArea,
  EquipmentAccess,
  GeneratedWorkout,
  GymCrowding,
  MissedWorkoutWindow,
  PreferredSplit,
  ProgramPhase,
  WeakPoint
} from "@/lib/types";
import { isLocalDailyWorkout, useDailyWorkoutPersistence } from "@/hooks/use-daily-workout-persistence";
import { generateWorkout, type WorkoutEngineContext } from "@/lib/workout/generator";
import { cn } from "@/lib/utils";

const sorenessMuscles: WeakPoint[] = ["chest", "shoulders", "back", "legs", "glutes", "core"];

function getTodayWorkoutDateKey() {
  return new Date().toISOString().slice(0, 10);
}

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
    copy: "Protect the rhythm",
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

function StepLabel({ step, title, copy }: { step: number; title: string; copy?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {copy ? <p className="mt-1 text-sm text-muted-foreground">{copy}</p> : null}
      </div>
    </div>
  );
}

export function WorkoutGenerator({
  engineContext,
  initialDailyWorkout,
  currentUserId
}: {
  engineContext?: Partial<WorkoutEngineContext>;
  initialDailyWorkout?: DailyWorkoutRecord | null;
  currentUserId?: string | null;
}) {
  const initialInput = initialDailyWorkout?.inputSnapshot ?? defaultInput;
  const {
    dailyWorkout,
    source: persistenceSource,
    setDailyWorkout,
    saveLocalFallback,
    updateLocalStatus
  } = useDailyWorkoutPersistence({
    initialDailyWorkout,
    currentUserId
  });
  const [input, setInput] = useState<DailyCheckIn>(initialInput);
  const [workout, setWorkout] = useState<GeneratedWorkout>(() => initialDailyWorkout?.workout ?? generateWorkout(initialInput, engineContext));
  const [message, setMessage] = useState(
    initialDailyWorkout ? "Today's workout loaded." : "Check in once. LiftLens will save today's plan after generation."
  );
  const [viewMode, setViewMode] = useState<WorkoutViewMode>("simple");
  const [hasGenerated, setHasGenerated] = useState(Boolean(initialDailyWorkout));
  const [isEditingInputs, setIsEditingInputs] = useState(!initialDailyWorkout);
  const [showRegenerateOptions, setShowRegenerateOptions] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
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

  useEffect(() => {
    if (!dailyWorkout) return;

    setInput(dailyWorkout.inputSnapshot);
    setWorkout(dailyWorkout.workout);
    setHasGenerated(true);
    setIsEditingInputs(false);
    setMessage(persistenceSource === "local" ? "Today's workout loaded from this browser." : "Today's workout loaded.");
  }, [dailyWorkout, persistenceSource]);

  useEffect(() => {
    if (dailyWorkout?.status !== "completed") {
      setShowCompletionModal(false);
    }
  }, [dailyWorkout?.status]);

  function closeCompletionModal() {
    setShowCompletionModal(false);
  }

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
    setMessage("Scenario applied. Update today's workout when the inputs look right.");
  }

  function resetInput() {
    const resetTo = dailyWorkout?.inputSnapshot ?? defaultInput;
    setInput(resetTo);
    setWorkout(dailyWorkout?.workout ?? generateWorkout(resetTo, engineContext));
    setHasGenerated(Boolean(dailyWorkout));
    setMessage("Balanced check-in restored. Generate when you are ready.");
  }

  function generate(overwriteExisting = Boolean(dailyWorkout)) {
    const next = generateWorkout(input, engineContext);
    setWorkout(next);
    setHasGenerated(true);
    setShowRegenerateOptions(false);
    setMessage("Building the server-side training dose from today's inputs.");

    startTransition(async () => {
      try {
        const result = await generateAdaptiveWorkoutAction(input, engineContext, {
          overwriteExisting
        });
        setWorkout(result.workout);
        if (result.dailyWorkout) {
          setDailyWorkout(result.dailyWorkout, "backend");
        } else {
          saveLocalFallback(result.workout, input);
        }
        setHasGenerated(true);
        setIsEditingInputs(false);
        setMessage(result.message);
      } catch {
        setWorkout(next);
        saveLocalFallback(next, input);
        setMessage("We used the local coach engine. The server pass did not finish, but your workout is ready.");
      }
    });
  }

  function startWorkout() {
    startTransition(async () => {
      try {
        if (isLocalDailyWorkout(dailyWorkout)) {
          updateLocalStatus("started");
          setMessage("Workout started.");
          document.getElementById("workout-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        const result = await updateDailyWorkoutStatusAction("started", dailyWorkout?.id);
        if (result.dailyWorkout) setDailyWorkout(result.dailyWorkout, "backend");
        setMessage(result.message);
        document.getElementById("workout-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        setMessage("We could not mark that started yet. The plan is still ready.");
      }
    });
  }

  function completeWorkout() {
    startTransition(async () => {
      try {
        if (isLocalDailyWorkout(dailyWorkout)) {
          updateLocalStatus("completed");
          setMessage("Workout completed. Momentum protected.");
          setShowCompletionModal(true);
          return;
        }

        const statusResult = await updateDailyWorkoutStatusAction("completed", dailyWorkout?.id);
        if (!statusResult.ok) {
          setMessage(statusResult.message);
          return;
        }
        if (statusResult.dailyWorkout) setDailyWorkout(statusResult.dailyWorkout, "backend");

        const saveResult = await saveWorkoutAction(workout, input);
        setMessage(saveResult.ok ? "Workout completed. Momentum protected." : saveResult.message);
        setShowCompletionModal(true);
      } catch {
        setMessage("We could not complete that yet. Your workout is still here, and you can try again in a moment.");
      }
    });
  }

  const showCheckIn = !hasGenerated || isEditingInputs;
  const generateCopy = dailyWorkout ? "Update today's workout" : "Generate workout";
  const loadedStatusCopy =
    dailyWorkout?.status === "completed"
      ? "Completed"
      : dailyWorkout?.status === "started"
        ? "Started"
        : dailyWorkout?.status === "skipped"
          ? "Skipped"
          : "Planned";
  const isTodayWorkoutCompleted =
    dailyWorkout?.status === "completed" && dailyWorkout.workoutDate === getTodayWorkoutDateKey();
  const showCompletedBanner = isTodayWorkoutCompleted && !showCompletionModal;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CompletionSuccessModal open={showCompletionModal} onClose={closeCompletionModal} />

      <CompletedTodayBanner show={showCompletedBanner} />

      {dailyWorkout && !showCheckIn ? (
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Today&apos;s workout loaded
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {loadedStatusCopy}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Version {dailyWorkout.version}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  This plan is saved for {dailyWorkout.workoutDate}. Refresh or leave the page and it will still be here.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInput(dailyWorkout.inputSnapshot);
                    setIsEditingInputs(true);
                    setShowRegenerateOptions(false);
                    setMessage("Editing today's saved inputs.");
                  }}
                >
                  Edit today&apos;s inputs
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowRegenerateOptions(true)}>
                  Regenerate workout
                </Button>
              </div>
            </div>

            {showRegenerateOptions ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-semibold text-white">Replace today&apos;s saved workout?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Regeneration keeps your current inputs and saves a new version. Use edit if the day changed.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="ghost" onClick={() => setShowRegenerateOptions(false)}>
                    Keep current workout
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInput(dailyWorkout.inputSnapshot);
                      setIsEditingInputs(true);
                      setShowRegenerateOptions(false);
                    }}
                  >
                    Edit inputs and update
                  </Button>
                  <Button type="button" onClick={() => generate(true)} disabled={isPending}>
                    {isPending ? "Regenerating..." : "Regenerate workout"}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showCheckIn ? (
        <>
          <section className="space-y-3">
            <StepLabel
              step={1}
              title="Today's check-in"
              copy={dailyWorkout ? "Update only what changed. The saved workout will be replaced intentionally." : "Set the big signals first. Fine-tune only if the day needs it."}
            />
            <Card className="border-white/10 bg-white/[0.04]">
              <CardContent className="space-y-5 p-5">
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
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

                  <div className="grid gap-4 sm:grid-cols-2">
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
                    label="Goal / focus"
                    value={input.bodyFocus}
                    options={bodyFocusOptions}
                    onChange={(value) => updateInput("bodyFocus", value)}
                  />
                </div>

                <details open={viewMode === "advanced"} className="group rounded-2xl border border-white/10 bg-white/[0.03]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      Fine-tune today
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
                  </summary>
                  <div className="space-y-5 border-t border-white/10 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Quick scenarios</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Optional presets for common real-life training days.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {realities.map((reality) => (
                          <button
                            key={reality.label}
                            type="button"
                            onClick={() => applyReality(reality.input)}
                            className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-primary/45 hover:bg-white/[0.06]"
                          >
                            <span className="block text-sm font-semibold text-white">{reality.label}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{reality.copy}</span>
                          </button>
                        ))}
                      </div>
                    </div>

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

                    <div className="grid gap-4 sm:grid-cols-2">
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
                    <div className="grid gap-4 sm:grid-cols-2">
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

                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-muted-foreground">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        Recovery guardrails
                      </div>
                      <span>Leave {workout.targetRir ?? 2} reps in reserve.</span>
                      <span>Recovery adjustment: {workout.deload?.active ? "Active" : "Not needed"}</span>
                    </div>

                    <Button variant="outline" onClick={resetInput} disabled={isPending} className="w-full sm:w-auto">
                      <RotateCcw className="h-4 w-4" />
                      Reset check-in
                    </Button>
                  </div>
                </details>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <StepLabel
              step={2}
              title={dailyWorkout ? "Update workout" : "Generate workout"}
              copy={dailyWorkout ? "This replaces today's saved version and increments the version number." : "One tap turns the check-in into today's training dose."}
            />
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.055] to-accent/10">
              <CardContent className="p-5 sm:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                      <WandSparkles className="h-4 w-4" />
                      {coachRead}
                      <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-muted-foreground">
                        readiness preview {fitScore}/100
                      </span>
                      {engineContext?.momentumProtectionMode ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Momentum protection
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {engineContext?.momentumProtectionMode
                        ? "Today will be shorter, simpler, and easier to start."
                        : getTradeoffCopy(input)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    {dailyWorkout ? (
                      <Button type="button" variant="ghost" onClick={() => setIsEditingInputs(false)} disabled={isPending}>
                        Keep current workout
                      </Button>
                    ) : null}
                    <Button onClick={() => generate(Boolean(dailyWorkout))} disabled={isPending} size="lg" className="w-full lg:w-auto">
                      <WandSparkles className="h-4 w-4" />
                      {isPending ? "Saving..." : generateCopy}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <StepLabel
            step={showCheckIn ? 3 : 1}
            title="Your workout"
            copy={hasGenerated ? "Summary first. Details only when you want them." : "Generate once your check-in matches the day."}
          />
          <div className="grid w-full grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1 sm:w-auto">
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
        </div>

        {hasGenerated ? (
          <WorkoutCard
            workout={workout}
            onStart={startWorkout}
            onComplete={completeWorkout}
            saving={isPending}
            message={message}
            viewMode={viewMode}
            status={dailyWorkout?.status}
          />
        ) : (
          <Card className="border-dashed border-white/15 bg-white/[0.025]">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-lg font-semibold text-white">Ready when you are.</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Fill in the check-in, then generate a plan. LiftLens will save it for today and reload it after refresh.
                </p>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                <Activity className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
