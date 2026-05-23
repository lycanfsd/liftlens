"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Loader2, Save, Sparkles } from "lucide-react";

import { updateProfileAction } from "@/app/app-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  equipmentOptions,
  experienceLevels,
  fitnessGoals,
  struggles,
  weakPoints
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ProfileFormValues = {
  display_name: string;
  age: number | "";
  sex: string;
  height: string;
  weight: string;
  training_experience: string;
  primary_goal: string;
  weekly_training_days: number | "";
  preferred_workout_length: number | "";
  equipment_access: string;
  weak_points: string[];
  biggest_struggle: string;
  injury_notes: string;
};

const sexOptions = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "self-described", label: "Self-described" }
];

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  placeholder
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
      >
        {placeholder ? (
          <option value="" className="bg-zinc-950">
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-950">
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ProfileForm({ initialValues }: { initialValues: ProfileFormValues }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {});
  const [selectedWeakPoints, setSelectedWeakPoints] = useState(initialValues.weak_points);

  const missingFields = useMemo(() => {
    const checks = [
      ["display name", initialValues.display_name],
      ["training experience", initialValues.training_experience],
      ["primary goal", initialValues.primary_goal],
      ["weekly training days", initialValues.weekly_training_days],
      ["equipment access", initialValues.equipment_access],
      ["biggest struggle", initialValues.biggest_struggle]
    ];

    return checks.filter(([, value]) => !value).map(([label]) => label);
  }, [initialValues]);

  function toggleWeakPoint(value: string) {
    setSelectedWeakPoints((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {selectedWeakPoints.map((weakPoint) => (
        <input key={weakPoint} type="hidden" name="weak_points" value={weakPoint} />
      ))}

      {missingFields.length > 0 ? (
        <Card className="border-accent/20 bg-accent/10">
          <CardContent className="flex gap-3 p-4">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-semibold text-white">Your profile is ready for a little more context.</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Add {missingFields.slice(0, 3).join(", ")}
                {missingFields.length > 3 ? ", and a few more details" : ""} so FlexFit can adapt with less guesswork.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {state.message ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm font-medium text-primary">
          {state.message}
        </div>
      ) : null}
      {state.error ? (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-primary">Personal info</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">The basics that tune the plan.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep this lightweight. FlexFit uses it to make better defaults, not to judge the day.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Display name">
              <Input name="display_name" defaultValue={initialValues.display_name} placeholder="Alex" />
            </Field>
            <Field label="Age">
              <Input name="age" type="number" min={13} max={100} defaultValue={initialValues.age} placeholder="32" />
            </Field>
            <SelectField label="Sex" name="sex" defaultValue={initialValues.sex} options={sexOptions} />
            <Field label="Height">
              <Input name="height" defaultValue={initialValues.height} placeholder="5'10&quot; or 178 cm" />
            </Field>
            <Field label="Weight">
              <Input name="weight" defaultValue={initialValues.weight} placeholder="175 lb or 79 kg" />
            </Field>
            <SelectField
              label="Training experience"
              name="training_experience"
              defaultValue={initialValues.training_experience}
              options={experienceLevels}
              placeholder="Choose experience"
            />
            <SelectField
              label="Primary goal"
              name="primary_goal"
              defaultValue={initialValues.primary_goal}
              options={fitnessGoals}
              placeholder="Choose goal"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold text-accent">Fitness preferences</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">How training fits real life.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              These are the constraints FlexFit should respect before it suggests volume or equipment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Weekly training days">
              <Input
                name="weekly_training_days"
                type="number"
                min={1}
                max={7}
                defaultValue={initialValues.weekly_training_days}
                placeholder="4"
              />
            </Field>
            <Field label="Preferred workout length">
              <Input
                name="preferred_workout_length"
                type="number"
                min={10}
                max={120}
                defaultValue={initialValues.preferred_workout_length}
                placeholder="35"
              />
            </Field>
            <SelectField
              label="Equipment access"
              name="equipment_access"
              defaultValue={initialValues.equipment_access}
              options={equipmentOptions}
              placeholder="Choose equipment"
            />
            <SelectField
              label="Biggest struggle"
              name="biggest_struggle"
              defaultValue={initialValues.biggest_struggle}
              options={struggles}
              placeholder="Choose friction point"
            />
          </div>

          <div className="mt-5">
            <Label>Weak points</Label>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {weakPoints.map((point) => {
                const selected = selectedWeakPoints.includes(point.value);
                return (
                  <button
                    key={point.value}
                    type="button"
                    onClick={() => toggleWeakPoint(point.value)}
                    className={cn(
                      "flex min-h-12 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-sm font-semibold text-white transition hover:border-primary/45 hover:bg-white/[0.06]",
                      selected && "border-primary/70 bg-primary/10 shadow-green"
                    )}
                  >
                    {point.label}
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/15 text-transparent",
                        selected && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <Field
              label="Injury limitations / notes"
              hint="Not medical advice. Add movements to avoid, past irritation, or recovery reminders."
            >
              <Textarea
                name="injury_notes"
                defaultValue={initialValues.injury_notes}
                placeholder="Example: Avoid deep knee flexion on high-soreness days."
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.04] to-accent/10">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-white">Save changes</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Today&apos;s plan fits better when your profile stays honest.
            </p>
          </div>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
