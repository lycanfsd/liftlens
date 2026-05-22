"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Gauge, Sparkles, Target } from "lucide-react";

import { saveOnboardingAction } from "@/app/app-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  equipmentOptions,
  experienceLevels,
  fitnessGoals,
  struggles,
  weakPoints
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type OnboardingValues = {
  primary_goal: string;
  experience_level: string;
  weekly_availability: number;
  typical_workout_length: number;
  equipment_access: string;
  biggest_struggle: string;
  weak_points: string[];
};

const initialValues: OnboardingValues = {
  primary_goal: "recomposition",
  experience_level: "intermediate",
  weekly_availability: 4,
  typical_workout_length: 35,
  equipment_access: "full-gym",
  biggest_struggle: "time",
  weak_points: ["shoulders", "back"]
};

const steps = [
  {
    title: "What should FlexFit optimize for?",
    copy: "This sets the bias for volume, intensity, and what counts as a good session.",
    eyebrow: "Goal"
  },
  {
    title: "How trained are you right now?",
    copy: "Not your identity. Just the starting difficulty.",
    eyebrow: "Experience"
  },
  {
    title: "What does your real week allow?",
    copy: "Paid fitness products should respect your calendar before they write workouts.",
    eyebrow: "Schedule"
  },
  {
    title: "Where does training usually break?",
    copy: "FlexFit uses this to make the fallback plan feel obvious, not like failure.",
    eyebrow: "Friction"
  },
  {
    title: "Choose quiet weak-point bias.",
    copy: "We will add small nudges without turning every workout into an overstuffed plan.",
    eyebrow: "Focus"
  }
];

function ChoiceCard({
  label,
  copy,
  selected,
  onClick
}: {
  label: string;
  copy?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-24 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-primary/45 hover:bg-white/[0.06]",
        selected && "border-primary/70 bg-primary/10 shadow-green"
      )}
    >
      <span className="block pr-8 font-semibold text-white">{label}</span>
      {copy ? <span className="mt-1 block text-sm leading-6 text-muted-foreground">{copy}</span> : null}
      <span
        className={cn(
          "absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border border-white/15 text-transparent",
          selected && "border-primary bg-primary text-primary-foreground"
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function MetricInput({
  label,
  value,
  suffix,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
          {value} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-5 w-full accent-primary"
      />
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4"
      />
    </div>
  );
}

export function OnboardingForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OnboardingValues>(initialValues);
  const current = steps[step];
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const fingerprint = useMemo(() => {
    const goal = fitnessGoals.find((item) => item.value === values.primary_goal)?.label ?? "Recomposition";
    const equipment = equipmentOptions.find((item) => item.value === values.equipment_access)?.label ?? "Full gym";
    const struggle = struggles.find((item) => item.value === values.biggest_struggle)?.label ?? "Time";
    return [
      `${goal} bias`,
      `${values.weekly_availability} days / ${values.typical_workout_length} min`,
      equipment,
      `${struggle} fallback`
    ];
  }, [values]);

  function setValue<Key extends keyof OnboardingValues>(key: Key, value: OnboardingValues[Key]) {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  }

  function toggleWeakPoint(value: string) {
    setValues((currentValues) => {
      const selected = currentValues.weak_points.includes(value);
      const weak_points = selected
        ? currentValues.weak_points.filter((item) => item !== value)
        : [...currentValues.weak_points, value];
      return { ...currentValues, weak_points };
    });
  }

  return (
    <form action={saveOnboardingAction} className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <input type="hidden" name="primary_goal" value={values.primary_goal} />
      <input type="hidden" name="experience_level" value={values.experience_level} />
      <input type="hidden" name="weekly_availability" value={values.weekly_availability} />
      <input type="hidden" name="typical_workout_length" value={values.typical_workout_length} />
      <input type="hidden" name="equipment_access" value={values.equipment_access} />
      <input type="hidden" name="biggest_struggle" value={values.biggest_struggle} />
      {values.weak_points.map((weakPoint) => (
        <input key={weakPoint} type="hidden" name="weak_points" value={weakPoint} />
      ))}

      <aside className="h-fit rounded-2xl border border-white/10 bg-black/30 p-5 lg:sticky lg:top-8">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">Fit profile</span>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Build the plan around your actual life.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The best onboarding does not ask for everything. It finds the constraints that change the workout.
        </p>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">{progress}% profile complete</p>

        <div className="mt-6 space-y-2">
          {fingerprint.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-white">
              <Check className="h-4 w-4 text-primary" />
              {item}
            </div>
          ))}
        </div>
      </aside>

      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-5 sm:p-6">
          {error ? (
            <div className="mb-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">{current.eyebrow}</p>
              <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-white sm:text-3xl">{current.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{current.copy}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
              {step + 1} / {steps.length}
            </span>
          </div>

          {step === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {fitnessGoals.map((item) => (
                <ChoiceCard
                  key={item.value}
                  label={item.label}
                  copy={item.copy}
                  selected={values.primary_goal === item.value}
                  onClick={() => setValue("primary_goal", item.value)}
                />
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {experienceLevels.map((item) => (
                <ChoiceCard
                  key={item.value}
                  label={item.label}
                  copy={
                    item.value === "beginner"
                      ? "Simple moves, clear wins"
                      : item.value === "intermediate"
                        ? "Progress without clutter"
                        : "More autonomy and load"
                  }
                  selected={values.experience_level === item.value}
                  onClick={() => setValue("experience_level", item.value)}
                />
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricInput
                label="Weekly availability"
                value={values.weekly_availability}
                suffix="days"
                min={1}
                max={7}
                onChange={(value) => setValue("weekly_availability", value)}
              />
              <MetricInput
                label="Typical workout length"
                value={values.typical_workout_length}
                suffix="min"
                min={10}
                max={90}
                onChange={(value) => setValue("typical_workout_length", value)}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  Equipment
                </div>
                <div className="grid gap-3">
                  {equipmentOptions.map((item) => (
                    <ChoiceCard
                      key={item.value}
                      label={item.label}
                      selected={values.equipment_access === item.value}
                      onClick={() => setValue("equipment_access", item.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Gauge className="h-4 w-4 text-accent" />
                  Biggest struggle
                </div>
                <div className="grid gap-3">
                  {struggles.map((item) => (
                    <ChoiceCard
                      key={item.value}
                      label={item.label}
                      selected={values.biggest_struggle === item.value}
                      onClick={() => setValue("biggest_struggle", item.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Target className="h-4 w-4 text-primary" />
                Choose at least one
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {weakPoints.map((point) => (
                  <ChoiceCard
                    key={point.value}
                    label={point.label}
                    selected={values.weak_points.includes(point.value)}
                    onClick={() => toggleWeakPoint(point.value)}
                  />
                ))}
              </div>
              {values.weak_points.length === 0 ? (
                <p className="mt-3 text-sm text-red-200">Choose one focus area so FlexFit has a useful bias.</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button type="button" onClick={() => setStep((currentStep) => currentStep + 1)}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={values.weak_points.length === 0}>
                Finish setup
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
