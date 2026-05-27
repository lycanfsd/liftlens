"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Gauge, Sparkles, Target } from "lucide-react";

import { saveOnboardingAction, skipOnboardingAction } from "@/app/app-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type OnboardingValues = {
  primary_goal: string;
  physique_focus: string[];
  experience_level: string;
  training_days_per_week: number;
  preferred_workout_length: string;
  equipment: string[];
  weak_points: string[];
  adjust_for_soreness: boolean;
  adjust_for_energy: boolean;
  adjust_for_time: boolean;
  beginner_explanations: boolean;
  emphasize_progress_analytics: boolean;
};

type PreferenceKey =
  | "adjust_for_soreness"
  | "adjust_for_energy"
  | "adjust_for_time"
  | "beginner_explanations"
  | "emphasize_progress_analytics";

const initialValues: OnboardingValues = {
  primary_goal: "build-muscle",
  physique_focus: ["balanced-muscle-growth"],
  experience_level: "intermediate",
  training_days_per_week: 4,
  preferred_workout_length: "45",
  equipment: ["full-gym"],
  weak_points: ["shoulders", "back"],
  adjust_for_soreness: true,
  adjust_for_energy: true,
  adjust_for_time: true,
  beginner_explanations: false,
  emphasize_progress_analytics: true
};

const goals = [
  ["build-muscle", "Build muscle"],
  ["lose-fat", "Lose fat"],
  ["recomposition", "Recomposition"],
  ["strength", "Get stronger"],
  ["athletic-performance", "Improve athleticism"],
  ["general-health", "General fitness"]
];

const physiqueFocus = [
  ["lean-athletic", "Lean and athletic"],
  ["bigger-upper-body", "Bigger upper body"],
  ["v-taper", "V-taper"],
  ["bigger-arms", "Bigger arms"],
  ["bigger-chest", "Bigger chest"],
  ["wider-shoulders", "Wider shoulders"],
  ["glutes-lower-body", "Glutes/lower body focus"],
  ["balanced-muscle-growth", "Balanced muscle growth"]
];

const experienceLevels = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"]
];

const equipmentOptions = [
  ["full-gym", "Full gym"],
  ["dumbbells-only", "Dumbbells only"],
  ["barbell-rack", "Barbell + rack"],
  ["machines", "Machines"],
  ["cables", "Cables"],
  ["bands", "Resistance bands"],
  ["bodyweight", "Bodyweight only"],
  ["home-gym", "Home gym"]
];

const weakPointOptions = [
  ["chest", "Chest"],
  ["back", "Back"],
  ["shoulders", "Shoulders"],
  ["arms", "Arms"],
  ["core", "Core"],
  ["quads", "Quads"],
  ["hamstrings", "Hamstrings"],
  ["glutes", "Glutes"],
  ["calves", "Calves"],
  ["conditioning", "Conditioning"]
];

const recoveryPreferences: Array<[PreferenceKey, string]> = [
  ["adjust_for_soreness", "Adjust for soreness"],
  ["adjust_for_energy", "Adjust for energy"],
  ["adjust_for_time", "Adjust for available time"],
  ["beginner_explanations", "Show beginner form help"],
  ["emphasize_progress_analytics", "Emphasize progress analytics"]
];

const stepTitles = [
  "Welcome",
  "Goal",
  "Physique",
  "Experience",
  "Schedule",
  "Equipment",
  "Weak points",
  "Preferences",
  "Ready"
];

function pretty(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ChoiceCard({
  label,
  selected,
  onClick,
  compact = false
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white/[0.06]",
        compact ? "min-h-14" : "min-h-20",
        selected && "border-primary/70 bg-primary/10 shadow-green"
      )}
    >
      <span className="block pr-8 font-semibold text-white">{label}</span>
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

function ToggleRow({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-primary/35 hover:bg-white/[0.055]"
    >
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className={cn("h-6 w-11 rounded-full border p-0.5 transition", enabled ? "border-primary bg-primary/25" : "border-white/15 bg-black/30")}>
        <span className={cn("block h-[18px] w-[18px] rounded-full bg-white transition", enabled && "translate-x-5 bg-primary")} />
      </span>
    </button>
  );
}

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OnboardingValues>(initialValues);
  const progress = Math.round(((step + 1) / stepTitles.length) * 100);
  const currentTitle = stepTitles[step];

  const fingerprint = useMemo(
    () => [
      pretty(values.primary_goal),
      `${values.training_days_per_week} days / ${values.preferred_workout_length === "75-plus" ? "75+" : values.preferred_workout_length} min`,
      `${values.equipment.length} equipment options`,
      `${values.weak_points.length} weak-point targets`
    ],
    [values]
  );

  function setValue<Key extends keyof OnboardingValues>(key: Key, value: OnboardingValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "physique_focus" | "equipment" | "weak_points", value: string) {
    setValues((current) => {
      const selected = current[key].includes(value);
      const next = selected ? current[key].filter((item) => item !== value) : [...current[key], value];
      return { ...current, [key]: next.length ? next : current[key] };
    });
  }

  return (
    <form action={saveOnboardingAction} className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <input type="hidden" name="primary_goal" value={values.primary_goal} />
      <input type="hidden" name="experience_level" value={values.experience_level} />
      <input type="hidden" name="training_days_per_week" value={values.training_days_per_week} />
      <input type="hidden" name="preferred_workout_length" value={values.preferred_workout_length} />
      {values.physique_focus.map((item) => (
        <input key={item} type="hidden" name="physique_focus" value={item} />
      ))}
      {values.equipment.map((item) => (
        <input key={item} type="hidden" name="equipment" value={item} />
      ))}
      {values.weak_points.map((item) => (
        <input key={item} type="hidden" name="weak_points" value={item} />
      ))}
      {recoveryPreferences.map(([key]) => (
        <input key={key} type="hidden" name={key} value={String(values[key])} />
      ))}

      <aside className="h-fit rounded-2xl border border-white/10 bg-black/30 p-5 lg:sticky lg:top-8">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">NOVYRA setup</span>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Make the plan yours.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Fast setup. Better daily calls.</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          Step {step + 1} of {stepTitles.length} - {currentTitle}
        </p>
        <div className="mt-5 space-y-2">
          {fingerprint.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-white">
              <Check className="h-4 w-4 text-primary" />
              {item}
            </div>
          ))}
        </div>
      </aside>

      <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.08),transparent_34%),rgba(255,255,255,0.035)]">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
              <span>{currentTitle}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step === 0 ? (
            <div className="grid min-h-[390px] place-items-center text-center">
              <div className="max-w-2xl">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Sparkles className="h-7 w-7" />
                </span>
                <h1 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">Welcome to NOVYRA</h1>
                <p className="mt-3 text-lg text-muted-foreground">Your daily AI fitness coach for building your dream physique.</p>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  A few quick answers. Smarter workouts every day.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button type="button" size="lg" onClick={() => setStep(1)}>
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    variant="ghost"
                    formAction={skipOnboardingAction}
                    className="text-muted-foreground hover:text-white"
                  >
                    Skip for now
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <Header eyebrow="Goal" title="What are you working toward?" copy="Pick the main outcome." />
              <div className="grid gap-3 sm:grid-cols-2">
                {goals.map(([value, label]) => (
                  <ChoiceCard key={value} label={label} selected={values.primary_goal === value} onClick={() => setValue("primary_goal", value)} />
                ))}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Header eyebrow="Dream physique" title="What physique are you building?" copy="Choose every focus that fits." />
              <div className="grid gap-3 sm:grid-cols-2">
                {physiqueFocus.map(([value, label]) => (
                  <ChoiceCard key={value} label={label} selected={values.physique_focus.includes(value)} onClick={() => toggleList("physique_focus", value)} />
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Header eyebrow="Experience" title="What is your training experience?" copy="This adjusts volume and coaching depth." />
              <div className="grid gap-3 sm:grid-cols-3">
                {experienceLevels.map(([value, label]) => (
                  <ChoiceCard key={value} label={label} selected={values.experience_level === value} onClick={() => setValue("experience_level", value)} />
                ))}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Header eyebrow="Schedule" title="What can you repeat?" copy="Realistic beats perfect." />
              <div className="grid gap-5 xl:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-semibold text-white">Training days per week</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:grid-cols-2">
                    {[2, 3, 4, 5, 6].map((days) => (
                      <ChoiceCard key={days} compact label={`${days} days`} selected={values.training_days_per_week === days} onClick={() => setValue("training_days_per_week", days)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-white">Preferred workout length</p>
                  <div className="grid grid-cols-2 gap-3">
                    {["30", "45", "60", "75-plus"].map((length) => (
                      <ChoiceCard
                        key={length}
                        compact
                        label={length === "75-plus" ? "75+ minutes" : `${length} minutes`}
                        selected={values.preferred_workout_length === length}
                        onClick={() => setValue("preferred_workout_length", length)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <Header eyebrow="Equipment" title="What do you usually have?" copy="Select all that apply." />
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Dumbbell className="h-4 w-4 text-primary" />
                Equipment access
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {equipmentOptions.map(([value, label]) => (
                  <ChoiceCard key={value} label={label} selected={values.equipment.includes(value)} onClick={() => toggleList("equipment", value)} />
                ))}
              </div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <Header eyebrow="Weak points" title="What should come up?" copy="We will bias these when recovery allows." />
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Target className="h-4 w-4 text-primary" />
                Choose one or more
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {weakPointOptions.map(([value, label]) => (
                  <ChoiceCard key={value} compact label={label} selected={values.weak_points.includes(value)} onClick={() => toggleList("weak_points", value)} />
                ))}
              </div>
            </>
          ) : null}

          {step === 7 ? (
            <>
              <Header eyebrow="Recovery" title="How should NOVYRA adapt?" copy="Keep the daily plan useful." />
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Gauge className="h-4 w-4 text-primary" />
                Adaptation preferences
              </div>
              <div className="grid gap-3">
                {recoveryPreferences.map(([key, label]) => (
                  <ToggleRow key={key} label={label} enabled={Boolean(values[key])} onClick={() => setValue(key, !values[key])} />
                ))}
              </div>
            </>
          ) : null}

          {step === 8 ? (
            <div className="grid min-h-[390px] place-items-center text-center">
              <div className="max-w-2xl">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Check className="h-7 w-7" />
                </span>
                <h1 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">You&apos;re ready</h1>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                  Your goals, schedule, equipment, and weak points now guide the daily plan.
                </p>
                <Button type="submit" size="lg" className="mt-8">
                  Go to Today
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {step > 0 && step < 8 ? (
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  variant="ghost"
                  formAction={skipOnboardingAction}
                  className="text-muted-foreground hover:text-white"
                >
                  Skip for now
                </Button>
                <Button type="button" onClick={() => setStep((current) => current + 1)}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </form>
  );
}

function Header({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}
