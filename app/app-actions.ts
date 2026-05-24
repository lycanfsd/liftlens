"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyCheckIn, GeneratedWorkout } from "@/lib/types";
import { generateAdaptiveWorkout, type WorkoutEngineContext } from "@/lib/workout/generator";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_WORKOUT_COACH_MODEL = "gpt-4.1-mini";

export type ActionResult = {
  ok: boolean;
  message: string;
};

export type WorkoutExplanationResult = {
  summary: string;
  source: "fake" | "openai" | "fallback";
};

export type ProfileActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

const onboardingSchema = z.object({
  primary_goal: z.enum(["lose-fat", "build-muscle", "recomposition", "strength", "general-health", "athletic-performance"]),
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
      training_experience: answer.experience_level,
      weekly_training_days: answer.weekly_availability,
      preferred_workout_length: answer.typical_workout_length,
      equipment_access: answer.equipment_access,
      biggest_struggle: answer.biggest_struggle,
      weak_points: answer.weak_points,
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
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

const profileSchema = z.object({
  display_name: z.string().trim().max(80, "Display name is too long.").optional(),
  age: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(13, "Age must be at least 13.").max(100, "Age looks too high.").optional()
  ),
  sex: z.string().trim().max(40, "Sex field is too long.").optional(),
  height: z.string().trim().max(40, "Height is too long.").optional(),
  weight: z.string().trim().max(40, "Weight is too long.").optional(),
  training_experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  primary_goal: z.enum(["lose-fat", "build-muscle", "recomposition", "strength", "general-health", "athletic-performance"]).optional(),
  weekly_training_days: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1, "Choose at least 1 training day.").max(7, "Training days must be 7 or fewer.").optional()
  ),
  preferred_workout_length: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(10, "Workout length must be at least 10 minutes.").max(120, "Workout length must be 120 minutes or less.").optional()
  ),
  equipment_access: z.enum(["full-gym", "home-gym", "dumbbells-only", "bodyweight"]).optional(),
  weak_points: z.array(z.string()).default([]),
  biggest_struggle: z
    .enum(["consistency", "diet", "motivation", "time", "gym-anxiety", "not-knowing-what-to-do"])
    .optional(),
  injury_notes: z.string().trim().max(800, "Notes must stay under 800 characters.").optional()
});

function optionalText(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function getResponseText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;

  const outputText = (payload as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText.trim();

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  const chunks: string[] = [];
  for (const item of output) {
    if (typeof item !== "object" || item === null) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (typeof contentItem !== "object" || contentItem === null) continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }

  return chunks.join("").trim() || null;
}

function fallbackWorkoutSummary(workout: GeneratedWorkout) {
  return `${workout.strategy ?? "Adaptive session"} selected at readiness ${workout.readinessScore ?? "--"}/100. The plan uses a ${workout.trainingDose ?? workout.intensity} dose, RIR ${workout.targetRir ?? 2}, and prioritizes ${(workout.prioritizedMuscleGroups ?? []).join(", ") || workout.focus} so today stays productive without outrunning recovery.`;
}

export async function enhanceWorkoutExplanationAction(
  workout: GeneratedWorkout
): Promise<WorkoutExplanationResult> {
  if (process.env.DEV_FAKE_AI === "true") {
    return {
      summary: fallbackWorkoutSummary(workout),
      source: "fake"
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      summary: fallbackWorkoutSummary(workout),
      source: "fallback"
    };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_WORKOUT_COACH_MODEL ?? DEFAULT_WORKOUT_COACH_MODEL,
        store: false,
        input: [
          {
            role: "system",
            content:
              "You are FlexFit AI, a premium physique coach. Polish the explanation only. Do not invent exercises, sets, reps, medical diagnoses, or new safety claims. Keep it under 75 words."
          },
          {
            role: "user",
            content: JSON.stringify({
              name: workout.name,
              strategy: workout.strategy,
              readinessScore: workout.readinessScore,
              trainingDose: workout.trainingDose,
              prioritizedMuscleGroups: workout.prioritizedMuscleGroups,
              why: workout.why,
              whatChanged: workout.explanation?.whatChanged,
              safety: workout.explanation?.safety
            })
          }
        ]
      })
    });

    if (!response.ok) {
      return {
        summary: fallbackWorkoutSummary(workout),
        source: "fallback"
      };
    }

    const payload = await response.json().catch(() => null);
    const summary = getResponseText(payload);

    return {
      summary: summary ?? fallbackWorkoutSummary(workout),
      source: summary ? "openai" : "fallback"
    };
  } catch {
    return {
      summary: fallbackWorkoutSummary(workout),
      source: "fallback"
    };
  }
}

export async function generateAdaptiveWorkoutAction(
  input: DailyCheckIn,
  context?: Partial<WorkoutEngineContext>
): Promise<{ workout: GeneratedWorkout; message: string }> {
  const workout = generateAdaptiveWorkout(input, context);
  const explanation = await enhanceWorkoutExplanationAction(workout);

  return {
    workout: {
      ...workout,
      aiSummary: {
        text: explanation.summary,
        source: explanation.source
      }
    },
    message: "Server engine generated today's adaptive training dose."
  };
}

export async function updateProfileAction(
  _previous: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    age: formData.get("age"),
    sex: formData.get("sex"),
    height: formData.get("height"),
    weight: formData.get("weight"),
    training_experience: formData.get("training_experience") || undefined,
    primary_goal: formData.get("primary_goal") || undefined,
    weekly_training_days: formData.get("weekly_training_days"),
    preferred_workout_length: formData.get("preferred_workout_length"),
    equipment_access: formData.get("equipment_access") || undefined,
    weak_points: formData.getAll("weak_points").map(String),
    biggest_struggle: formData.get("biggest_struggle") || undefined,
    injury_notes: formData.get("injury_notes")
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Check your profile details and try again."
    };
  }

  if (!isSupabaseConfigured) {
    return {
      ok: true,
      message: "Profile saved in demo mode. Connect Supabase to persist profile edits."
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Log in again before saving your profile." };
  }

  const profile = parsed.data;
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      display_name: optionalText(profile.display_name),
      age: profile.age ?? null,
      sex: optionalText(profile.sex),
      height: optionalText(profile.height),
      weight: optionalText(profile.weight),
      training_experience: profile.training_experience ?? null,
      experience_level: profile.training_experience ?? null,
      primary_goal: profile.primary_goal ?? null,
      weekly_training_days: profile.weekly_training_days ?? null,
      preferred_workout_length: profile.preferred_workout_length ?? null,
      equipment_access: profile.equipment_access ?? null,
      weak_points: profile.weak_points,
      biggest_struggle: profile.biggest_struggle ?? null,
      injury_notes: optionalText(profile.injury_notes),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return {
      ok: false,
      error: `We could not save that yet: ${error.message}`
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: "Profile updated. Future workouts have better context now."
  };
}

const workoutSchema = z.object({
  workout: z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number(),
    focus: z.string(),
    intensity: z.string(),
    readinessScore: z.number().optional(),
    trainingDose: z.string().optional(),
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
      }).passthrough()
    ),
    why: z.array(z.string()),
    condensed: z.array(z.string())
  }).passthrough(),
  input: z.object({
    timeAvailable: z.number(),
    energy: z.number(),
    soreness: z.number(),
    sleepQuality: z.number().optional(),
    stressLevel: z.number().optional(),
    equipment: z.string(),
    crowding: z.string(),
    bodyFocus: z.string(),
    missedWorkouts: z.string().optional(),
    discomfortArea: z.string().optional(),
    sorenessByMuscle: z.record(z.number()).optional(),
    injuryAreas: z.array(z.string()).optional(),
    preferredSplit: z.string().optional(),
    currentProgramPhase: z.string().optional(),
    dislikedExercises: z.array(z.string()).optional()
  }).passthrough()
});

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function shouldRetryLegacyWorkoutInsert(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.message?.toLowerCase().includes("schema cache") ||
    error.message?.toLowerCase().includes("column")
  );
}

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

  const workoutForSave = parsed.data.workout as unknown as GeneratedWorkout;
  const inputForSave = parsed.data.input as unknown as DailyCheckIn;

  const legacyWorkoutInsert = {
    user_id: user.id,
    workout_name: workoutForSave.name,
    duration: workoutForSave.duration,
    focus: workoutForSave.focus,
    intensity: workoutForSave.intensity,
    energy: inputForSave.energy,
    soreness: inputForSave.soreness,
    time_available: inputForSave.timeAvailable,
    equipment: inputForSave.equipment,
    gym_crowding: inputForSave.crowding,
    body_focus: inputForSave.bodyFocus,
    warmup: workoutForSave.warmup,
    why_it_fits: workoutForSave.why,
    condensed_version: workoutForSave.condensed,
    completed_exercises: workoutForSave.exercises.length
  };

  const enhancedWorkoutInsert = {
    ...legacyWorkoutInsert,
    workout_date: new Date().toISOString().slice(0, 10),
    readiness_score: workoutForSave.readinessScore ?? null,
    training_dose: workoutForSave.trainingDose ?? workoutForSave.intensity,
    input_snapshot: jsonSafe(inputForSave),
    workout_json: jsonSafe(workoutForSave),
    explanation:
      workoutForSave.explanation?.whyThisWorkout ??
      workoutForSave.why.join("\n")
  };

  let workoutResult = await supabase
    .from("workouts")
    .insert(enhancedWorkoutInsert)
    .select("id")
    .single();

  if (shouldRetryLegacyWorkoutInsert(workoutResult.error)) {
    console.error("[saveWorkoutAction] Enhanced workout columns are missing; retrying legacy insert.", {
      message: workoutResult.error?.message,
      code: workoutResult.error?.code,
      expectedColumns: ["workout_date", "readiness_score", "training_dose", "input_snapshot", "workout_json", "explanation"]
    });

    workoutResult = await supabase.from("workouts").insert(legacyWorkoutInsert).select("id").single();
  }

  const { data: savedWorkout, error } = workoutResult;

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
