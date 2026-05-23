"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyCheckIn, GeneratedWorkout } from "@/lib/types";

export type ActionResult = {
  ok: boolean;
  message: string;
};

const onboardingSchema = z.object({
  primary_goal: z.enum(["lose-fat", "build-muscle", "recomposition", "strength", "general-health"]),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]),
  weekly_availability: z.coerce.number().min(1).max(7),
  typical_workout_length: z.coerce.number().min(10).max(120),
  equipment_access: z.enum(["full-gym", "home-gym", "dumbbells-only", "bodyweight"]),
  biggest_struggle: z.enum([
    "consistency",
    "diet",
    "motivation",
    "time",
    "gym-anxiety",
    "not-knowing-what-to-do"
  ]),
  weak_points: z.array(z.string()).min(1, "Choose at least one weak point.")
});

export async function saveOnboardingAction(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    primary_goal: formData.get("primary_goal"),
    experience_level: formData.get("experience_level"),
    weekly_availability: formData.get("weekly_availability"),
    typical_workout_length: formData.get("typical_workout_length"),
    equipment_access: formData.get("equipment_access"),
    biggest_struggle: formData.get("biggest_struggle"),
    weak_points: formData.getAll("weak_points")
  });

  if (!parsed.success) {
    redirect(`/onboarding?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Check your answers.")}`);
  }

  if (!isSupabaseConfigured) {
    redirect("/dashboard?demo=onboarding");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const answer = parsed.data;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      primary_goal: answer.primary_goal,
      experience_level: answer.experience_level,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
  }

  const { error } = await supabase.from("onboarding_answers").upsert(
    {
      user_id: user.id,
      primary_goal: answer.primary_goal,
      experience_level: answer.experience_level,
      weekly_availability: answer.weekly_availability,
      typical_workout_length: answer.typical_workout_length,
      equipment_access: answer.equipment_access,
      biggest_struggle: answer.biggest_struggle,
      weak_points: answer.weak_points,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const workoutSchema = z.object({
  workout: z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number(),
    focus: z.string(),
    intensity: z.string(),
    warmup: z.array(z.string()),
    exercises: z.array(
      z.object({
        name: z.string(),
        muscleGroup: z.string(),
        equipment: z.string(),
        sets: z.number(),
        reps: z.string(),
        rest: z.string(),
        cue: z.string(),
        substitution: z.string()
      })
    ),
    why: z.array(z.string()),
    condensed: z.array(z.string())
  }),
  input: z.object({
    timeAvailable: z.number(),
    energy: z.number(),
    soreness: z.number(),
    equipment: z.string(),
    crowding: z.string(),
    bodyFocus: z.string()
  })
});

export async function saveWorkoutAction(
  workout: GeneratedWorkout,
  input: DailyCheckIn
): Promise<ActionResult> {
  const parsed = workoutSchema.safeParse({ workout, input });

  if (!parsed.success) {
    return { ok: false, message: "Workout could not be saved. Please regenerate and try again." };
  }

  if (!isSupabaseConfigured) {
    return { ok: true, message: "Saved in demo mode. Connect Supabase to persist workout history." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Log in again to save this workout." };
  }

  const { data: savedWorkout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      workout_name: parsed.data.workout.name,
      duration: parsed.data.workout.duration,
      focus: parsed.data.workout.focus,
      intensity: parsed.data.workout.intensity,
      energy: parsed.data.input.energy,
      soreness: parsed.data.input.soreness,
      time_available: parsed.data.input.timeAvailable,
      equipment: parsed.data.input.equipment,
      gym_crowding: parsed.data.input.crowding,
      body_focus: parsed.data.input.bodyFocus,
      warmup: parsed.data.workout.warmup,
      why_it_fits: parsed.data.workout.why,
      condensed_version: parsed.data.workout.condensed,
      completed_exercises: parsed.data.workout.exercises.length
    })
    .select("id")
    .single();

  if (error || !savedWorkout) {
    return { ok: false, message: error?.message ?? "Unable to save workout." };
  }

  const { error: exerciseError } = await supabase.from("workout_exercises").insert(
    parsed.data.workout.exercises.map((exercise, index) => ({
      user_id: user.id,
      workout_id: savedWorkout.id,
      exercise_order: index + 1,
      name: exercise.name,
      muscle_group: exercise.muscleGroup,
      equipment: exercise.equipment,
      sets: exercise.sets,
      reps: exercise.reps,
      rest: exercise.rest,
      cue: exercise.cue,
      substitution: exercise.substitution
    }))
  );

  if (exerciseError) {
    return { ok: false, message: exerciseError.message };
  }

  const { error: logError } = await supabase.from("workout_logs").insert({
    user_id: user.id,
    workout_id: savedWorkout.id,
    completed_at: new Date().toISOString(),
    duration: parsed.data.workout.duration,
    focus: parsed.data.workout.focus,
    energy: parsed.data.input.energy,
    soreness: parsed.data.input.soreness
  });

  if (logError) {
    return { ok: false, message: logError.message };
  }

  revalidatePath("/history");
  revalidatePath("/dashboard");
  return { ok: true, message: "Workout saved. Nice, real-life consistency." };
}
