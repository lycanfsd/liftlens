"use client";

import { useMemo, useState, useTransition } from "react";
import { Activity, BatteryMedium, Clock3, MapPin, RotateCcw, WandSparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { saveWorkoutAction } from "@/app/app-actions";
import { WorkoutCard } from "@/components/workout-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bodyFocusOptions, crowdingOptions, equipmentOptions } from "@/lib/constants";
import type { BodyFocus, DailyCheckIn, EquipmentAccess, GeneratedWorkout, GymCrowding } from "@/lib/types";
import { generateWorkout } from "@/lib/workout/generator";
import { cn } from "@/lib/utils";

const defaultInput: DailyCheckIn = {
  timeAvailable: 35,
  energy: 3,
  soreness: 2,
  equipment: "full-gym",
  crowding: "moderate",
  bodyFocus: "auto"
};

const realities: { label: string; copy: string; input: DailyCheckIn }[] = [
  {
    label: "Calendar squeezed",
    copy: "20 min, enough to count",
    input: { ...defaultInput, timeAvailable: 20, energy: 3, bodyFocus: "full-body" }
  },
  {
    label: "Low battery",
    copy: "Keep the streak alive",
    input: { ...defaultInput, timeAvailable: 25, energy: 2, soreness: 3, bodyFocus: "upper" }
  },
  {
    label: "Packed gym",
    copy: "One-corner substitutions",
    input: { ...defaultInput, crowding: "packed", equipment: "dumbbells-only", bodyFocus: "full-body" }
  },
  {
    label: "Ready to push",
    copy: "More output, still controlled",
    input: { ...defaultInput, timeAvailable: 50, energy: 5, soreness: 1, bodyFocus: "full-body" }
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

export function WorkoutGenerator() {
  const [input, setInput] = useState<DailyCheckIn>(defaultInput);
  const [workout, setWorkout] = useState<GeneratedWorkout>(() => generateWorkout(defaultInput));
  const [message, setMessage] = useState("Generated from a balanced default day. Adjust signals when life changes.");
  const [isPending, startTransition] = useTransition();

  const fitScore = useMemo(() => {
    const timeScore = Math.min(input.timeAvailable, 45) / 45;
    const energyScore = input.energy / 5;
    const sorenessScore = (6 - input.soreness) / 5;
    const crowdingPenalty = input.crowding === "packed" ? 0.12 : input.crowding === "moderate" ? 0.04 : 0;
    return Math.round(Math.max(38, Math.min(96, (timeScore * 0.28 + energyScore * 0.4 + sorenessScore * 0.32 - crowdingPenalty) * 100)));
  }, [input]);

  const coachRead = useMemo(() => {
    if (input.energy <= 2) return "Minimum effective dose";
    if (input.soreness >= 4) return "Recovery-aware session";
    if (input.crowding === "packed") return "Low-wait gym strategy";
    if (input.energy >= 4 && input.timeAvailable >= 40) return "Productive push";
    return "Steady progress";
  }, [input]);

  function updateInput<T extends keyof DailyCheckIn>(key: T, value: DailyCheckIn[T]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function applyReality(nextInput: DailyCheckIn) {
    setInput(nextInput);
    const nextWorkout = generateWorkout(nextInput);
    setWorkout(nextWorkout);
    setMessage("Reality applied. The workout changed before your motivation had to negotiate.");
  }

  function generate() {
    const next = generateWorkout(input);
    setWorkout(next);
    setMessage("Today's plan fits today's life.");
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
                  <span className="text-sm font-semibold">Adaptive briefing</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">{coachRead}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  FlexFit changes the session before a bad day turns into a missed day.
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
              onChange={(value) => updateInput("soreness", value)}
            />

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

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="h-4 w-4 text-accent" />
                Plan tradeoff
              </div>
              {input.crowding === "packed"
                ? "This version avoids machine bottlenecks and keeps substitutions close."
                : input.energy <= 2
                  ? "This version keeps the habit alive without pretending you are fully charged."
                  : "This version balances progress with enough flexibility to actually start."}
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

      <WorkoutCard workout={workout} onSave={save} saving={isPending} message={message} />
    </div>
  );
}
