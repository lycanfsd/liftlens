"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { PhysiqueMeasurementEntry } from "@/lib/progress/physique-metrics";
import { mainPRLifts, type PRHistoryEntry } from "@/lib/progress/pr-history";
import { calculateRecoveryScore, type RecoveryLogEntry } from "@/lib/progress/recovery-metrics";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyCheckIn, DailyWorkoutRecord, DailyWorkoutStatus, GeneratedWorkout } from "@/lib/types";
import {
  getCurrentUserTodayDailyWorkoutResult,
  saveTodayDailyWorkoutForUser,
  updateTodayDailyWorkoutStatusForUser
} from "@/lib/workout/daily-workouts";
import { generateAdaptiveWorkout, type WorkoutEngineContext } from "@/lib/workout/generator";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_WORKOUT_COACH_MODEL = "gpt-4.1-mini";
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ActionResult = {
  ok: boolean;
  message: string;
};

type EntryActionResult<T> = ActionResult & {
  entry?: T;
};

export type WorkoutExplanationResult = {
  summary: string;
  source: "fake" | "openai" | "fallback";
};

export type GenerateAdaptiveWorkoutOptions = {
  persistDaily?: boolean;
  overwriteExisting?: boolean;
};

export type GenerateAdaptiveWorkoutResult = {
  workout: GeneratedWorkout;
  message: string;
  dailyWorkout?: DailyWorkoutRecord | null;
  blockedByExisting?: boolean;
  debugMessage?: string;
  userId?: string | null;
  workoutDate?: string;
};

export type ProfileActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

const primaryGoalSchema = z.enum(["lose-fat", "build-muscle", "recomposition", "strength", "general-health", "athletic-performance"]);
const experienceLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
const onboardingSchema = z.object({
  primary_goal: primaryGoalSchema,
  physique_focus: z.array(z.string()).default([]),
  experience_level: experienceLevelSchema,
  training_days_per_week: z.coerce.number().min(2).max(6),
  preferred_workout_length: z.enum(["30", "45", "60", "75-plus"]),
  equipment: z.array(z.string()).min(1, "Choose at least one equipment option."),
  weak_points: z.array(z.string()).min(1, "Choose at least one weak point."),
  adjust_for_soreness: z.coerce.boolean().default(true),
  adjust_for_energy: z.coerce.boolean().default(true),
  adjust_for_time: z.coerce.boolean().default(true),
  beginner_explanations: z.coerce.boolean().default(false),
  emphasize_progress_analytics: z.coerce.boolean().default(true)
});

function primaryEquipmentAccess(equipment: string[]) {
  if (equipment.includes("bodyweight")) return "bodyweight";
  if (equipment.includes("dumbbells-only")) return "dumbbells-only";
  if (equipment.includes("home-gym")) return "home-gym";
  return "full-gym";
}

function preferredLengthToMinutes(value: string) {
  if (value === "75-plus") return 75;
  return Number(value) || 45;
}

export async function saveOnboardingAction(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    primary_goal: formData.get("primary_goal"),
    physique_focus: formData.getAll("physique_focus"),
    experience_level: formData.get("experience_level"),
    training_days_per_week: formData.get("training_days_per_week") ?? formData.get("weekly_availability"),
    preferred_workout_length: formData.get("preferred_workout_length") ?? formData.get("typical_workout_length"),
    equipment: formData.getAll("equipment").length ? formData.getAll("equipment") : [formData.get("equipment_access")].filter(Boolean),
    weak_points: formData.getAll("weak_points"),
    adjust_for_soreness: formData.get("adjust_for_soreness") === "true",
    adjust_for_energy: formData.get("adjust_for_energy") === "true",
    adjust_for_time: formData.get("adjust_for_time") === "true",
    beginner_explanations: formData.get("beginner_explanations") === "true",
    emphasize_progress_analytics: formData.get("emphasize_progress_analytics") !== "false"
  });

  if (!parsed.success) {
    redirect(`/onboarding?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? "Check your answers.")}`);
  }

  if (!isSupabaseConfigured) redirect("/workout?tutorial=1");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const answer = parsed.data;
  const equipmentAccess = primaryEquipmentAccess(answer.equipment);
  const preferredMinutes = preferredLengthToMinutes(answer.preferred_workout_length);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      primary_goal: answer.primary_goal,
      experience_level: answer.experience_level,
      training_experience: answer.experience_level,
      weekly_training_days: answer.training_days_per_week,
      preferred_workout_length: preferredMinutes,
      equipment_access: equipmentAccess,
      biggest_struggle: "not-knowing-what-to-do",
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
      weekly_availability: answer.training_days_per_week,
      typical_workout_length: preferredMinutes,
      equipment_access: equipmentAccess,
      biggest_struggle: "not-knowing-what-to-do",
      weak_points: answer.weak_points,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  const { error: fitnessProfileError } = await supabase.from("user_fitness_profiles").upsert(
    {
      user_id: user.id,
      primary_goal: answer.primary_goal,
      physique_focus: answer.physique_focus,
      experience_level: answer.experience_level,
      training_days_per_week: answer.training_days_per_week,
      preferred_workout_length: answer.preferred_workout_length,
      equipment: answer.equipment,
      weak_points: answer.weak_points,
      adjust_for_soreness: answer.adjust_for_soreness,
      adjust_for_energy: answer.adjust_for_energy,
      adjust_for_time: answer.adjust_for_time,
      beginner_explanations: answer.beginner_explanations,
      emphasize_progress_analytics: answer.emphasize_progress_analytics,
      onboarding_completed: true,
      onboarding_skipped: false,
      tutorial_completed: false,
      checklist_progress: {
        completedProfile: true
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (fitnessProfileError) {
    redirect(`/onboarding?error=${encodeURIComponent(fitnessProfileError.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/workout");
  revalidatePath("/progress");
  revalidatePath("/", "layout");
  redirect("/workout?tutorial=1");
}

export async function skipOnboardingAction() {
  if (!isSupabaseConfigured) redirect("/workout");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("user_fitness_profiles").upsert(
    {
      user_id: user.id,
      onboarding_completed: true,
      onboarding_skipped: true,
      tutorial_completed: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/workout");
  redirect("/workout");
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
  context?: Partial<WorkoutEngineContext>,
  options: GenerateAdaptiveWorkoutOptions = {}
): Promise<GenerateAdaptiveWorkoutResult> {
  const workout = generateAdaptiveWorkout(input, context);
  const explanation = await enhanceWorkoutExplanationAction(workout);
  const enhancedWorkout: GeneratedWorkout = {
    ...workout,
    aiSummary: {
      text: explanation.summary,
      source: explanation.source
    }
  };

  if (options.persistDaily === false) {
    return {
      workout: enhancedWorkout,
      message: "Server engine generated today's adaptive training dose."
    };
  }

  if (!isSupabaseConfigured) {
    return {
      workout: enhancedWorkout,
      message: "Generated in demo mode. Connect Supabase to keep today's workout after refresh."
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      workout: enhancedWorkout,
      message: "Workout generated. Log in to keep it saved for today."
    };
  }

  const dailyResult = await saveTodayDailyWorkoutForUser({
    supabase,
    userId: user.id,
    input,
    workout: enhancedWorkout,
    overwriteExisting: options.overwriteExisting ?? false
  });

  if (dailyResult.blockedByExisting && dailyResult.record) {
    return {
      workout: dailyResult.record.workout,
      dailyWorkout: dailyResult.record,
      blockedByExisting: true,
      message: "Today's workout is already saved. Keep it, edit inputs, or regenerate when you mean to replace it.",
      debugMessage: dailyResult.debugMessage,
      userId: dailyResult.userId,
      workoutDate: dailyResult.workoutDate
    };
  }

  if (dailyResult.error) {
    return {
      workout: enhancedWorkout,
      dailyWorkout: dailyResult.record,
      message: `Workout generated, but today's save did not finish: ${dailyResult.error}`,
      debugMessage: dailyResult.debugMessage ?? `Save failed: ${dailyResult.error}`,
      userId: dailyResult.userId,
      workoutDate: dailyResult.workoutDate
    };
  }

  const { data: profile } = await supabase
    .from("user_fitness_profiles")
    .select("checklist_progress")
    .eq("user_id", user.id)
    .maybeSingle();
  const checklist = (profile?.checklist_progress ?? {}) as Record<string, unknown>;
  await supabase.from("user_fitness_profiles").upsert(
    {
      user_id: user.id,
      checklist_progress: {
        ...checklist,
        generatedFirstWorkout: true
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/workout");
  revalidatePath("/dashboard");

  return {
    workout: dailyResult.record?.workout ?? enhancedWorkout,
    dailyWorkout: dailyResult.record,
    message: dailyResult.record && dailyResult.record.version > 1
      ? "Workout updated based on your new inputs."
      : "Workout saved for today.",
    debugMessage: dailyResult.debugMessage,
    userId: dailyResult.userId,
    workoutDate: dailyResult.workoutDate
  };
}

export async function loadTodayDailyWorkoutAction(): Promise<{
  dailyWorkout: DailyWorkoutRecord | null;
  debugMessage: string;
  error?: string;
  userId: string | null;
  workoutDate: string;
}> {
  const result = await getCurrentUserTodayDailyWorkoutResult();
  return {
    dailyWorkout: result.record,
    debugMessage: result.debugMessage,
    error: result.error,
    userId: result.userId,
    workoutDate: result.workoutDate
  };
}

const dailyWorkoutStatusSchema = z.enum(["planned", "started", "completed", "skipped"]);

export async function updateDailyWorkoutStatusAction(
  status: DailyWorkoutStatus,
  workoutId?: string | null
): Promise<{ ok: boolean; message: string; dailyWorkout?: DailyWorkoutRecord | null; debugMessage?: string }> {
  const parsed = dailyWorkoutStatusSchema.safeParse(status);

  if (!parsed.success) {
    return { ok: false, message: "That workout status is not supported yet." };
  }

  if (!isSupabaseConfigured) {
    return { ok: true, message: `Demo mode: workout marked ${parsed.data}.` };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Log in again to update this workout." };
  }

  const result = await updateTodayDailyWorkoutStatusForUser({
    supabase,
    userId: user.id,
    status: parsed.data,
    workoutId
  });

  if (result.error) {
    return { ok: false, message: result.error, debugMessage: result.debugMessage ?? `Save failed: ${result.error}` };
  }

  if (parsed.data === "completed" && result.record) {
    const historyResult = await persistCompletedDailyWorkoutHistory({
      supabase,
      userId: user.id,
      dailyWorkout: result.record
    });

    if (!historyResult.ok) {
      debugProgressSync("legacy workout history sync failed; daily_workouts remains canonical", {
        user_id: user.id,
        daily_workout_id: result.record.id,
        message: historyResult.message
      });
    }

    const { data: profile } = await supabase
      .from("user_fitness_profiles")
      .select("checklist_progress")
      .eq("user_id", user.id)
      .maybeSingle();
    const checklist = (profile?.checklist_progress ?? {}) as Record<string, unknown>;
    await supabase.from("user_fitness_profiles").upsert(
      {
        user_id: user.id,
        checklist_progress: {
          ...checklist,
          completedFirstWorkout: true,
          generatedFirstWorkout: true
        },
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );
  }

  revalidatePath("/workout");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/progress");

  const labels: Record<DailyWorkoutStatus, string> = {
    planned: "Workout moved back to planned.",
    started: "Workout started. Keep the first set clean.",
    completed: "Workout completed. Momentum protected.",
    skipped: "Workout skipped without guilt. The next plan will adapt."
  };

  return {
    ok: true,
    message: labels[parsed.data],
    dailyWorkout: result.record,
    debugMessage: result.debugMessage
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

  const { data: fitnessProfile } = await supabase
    .from("user_fitness_profiles")
    .select("checklist_progress")
    .eq("user_id", user.id)
    .maybeSingle();
  const checklist = (fitnessProfile?.checklist_progress ?? {}) as Record<string, unknown>;
  await supabase.from("user_fitness_profiles").upsert(
    {
      user_id: user.id,
      checklist_progress: {
        ...checklist,
        completedProfile: true
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/workout");
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

const prHistorySchema = z.object({
  lift: z.enum(mainPRLifts),
  date: z.string().min(1, "Choose a date."),
  oneRepMax: z.coerce.number().positive("Enter a positive one-rep max."),
  unit: z.enum(["lb", "kg"]).default("lb"),
  notes: z.string().trim().max(240, "Keep notes under 240 characters.").optional()
});

const optionalMetricNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().nullable()
);

const physiqueMeasurementSchema = z.object({
  date: z.string().min(1, "Choose a date."),
  weight: optionalMetricNumber,
  waist: optionalMetricNumber,
  chest: optionalMetricNumber,
  shoulders: optionalMetricNumber,
  arms: optionalMetricNumber,
  thighs: optionalMetricNumber,
  hipsGlutes: optionalMetricNumber,
  bodyFat: optionalMetricNumber
});

const recoveryLogSchema = z.object({
  date: z.string().min(1, "Choose a date."),
  sleepHours: z.coerce.number().min(0).max(14),
  energy: z.coerce.number().min(1).max(10),
  soreness: z.coerce.number().min(1).max(10),
  stress: z.coerce.number().min(1).max(10),
  workoutRpe: z.coerce.number().min(1).max(10)
});

function mapPrRow(row: Record<string, unknown>): PRHistoryEntry {
  return {
    id: String(row.id),
    lift: String(row.lift),
    date: String(row.date),
    oneRepMax: Number(row.one_rep_max),
    unit: row.unit === "kg" ? "kg" : "lb",
    notes: typeof row.notes === "string" ? row.notes : undefined,
    createdAt: String(row.created_at)
  };
}

function mapPhysiqueRow(row: Record<string, unknown>): PhysiqueMeasurementEntry {
  return {
    id: String(row.id),
    date: String(row.date),
    weight: typeof row.weight === "number" ? row.weight : null,
    waist: typeof row.waist === "number" ? row.waist : null,
    chest: typeof row.chest === "number" ? row.chest : null,
    shoulders: typeof row.shoulders === "number" ? row.shoulders : null,
    arms: typeof row.arms === "number" ? row.arms : null,
    thighs: typeof row.thighs === "number" ? row.thighs : null,
    hipsGlutes: typeof row.hips_glutes === "number" ? row.hips_glutes : null,
    bodyFat: typeof row.body_fat === "number" ? row.body_fat : null
  };
}

function mapRecoveryRow(row: Record<string, unknown>): RecoveryLogEntry {
  return {
    id: String(row.id),
    date: String(row.date),
    sleepHours: Number(row.sleep_hours),
    energy: Number(row.energy),
    soreness: Number(row.soreness),
    stress: Number(row.stress),
    workoutRpe: Number(row.workout_rpe),
    score: Number(row.score)
  };
}

export async function savePrHistoryEntryAction(input: unknown): Promise<EntryActionResult<PRHistoryEntry>> {
  const parsed = prHistorySchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Check that PR entry." };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to sync PRs to your account." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Log in again to save this PR." };
  }

  const entry = parsed.data;
  const { data, error } = await supabase
    .from("pr_history")
    .upsert(
      {
        user_id: user.id,
        lift: entry.lift,
        date: entry.date,
        one_rep_max: Math.round(entry.oneRepMax * 10) / 10,
        unit: entry.unit,
        notes: entry.notes || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,lift,date" }
    )
    .select("id, lift, date, one_rep_max, unit, notes, created_at")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "We could not save that PR yet." };
  }

  const { data: profile } = await supabase
    .from("user_fitness_profiles")
    .select("checklist_progress")
    .eq("user_id", user.id)
    .maybeSingle();
  const checklist = (profile?.checklist_progress ?? {}) as Record<string, unknown>;
  await supabase.from("user_fitness_profiles").upsert(
    {
      user_id: user.id,
      checklist_progress: {
        ...checklist,
        loggedFirstPr: true
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/progress");
  revalidatePath("/workout");
  return { ok: true, message: `${entry.lift} PR saved to your account.`, entry: mapPrRow(data as Record<string, unknown>) };
}

export async function savePhysiqueMeasurementAction(input: unknown): Promise<EntryActionResult<PhysiqueMeasurementEntry>> {
  const parsed = physiqueMeasurementSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Check that measurement." };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to sync measurements to your account." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Log in again to save measurements." };
  }

  const entry = parsed.data;
  const { data, error } = await supabase
    .from("physique_measurements")
    .upsert(
      {
        user_id: user.id,
        date: entry.date,
        weight: entry.weight,
        waist: entry.waist,
        chest: entry.chest,
        shoulders: entry.shoulders,
        arms: entry.arms,
        thighs: entry.thighs,
        hips_glutes: entry.hipsGlutes,
        body_fat: entry.bodyFat,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,date" }
    )
    .select("id, date, weight, waist, chest, shoulders, arms, thighs, hips_glutes, body_fat")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "We could not save those measurements yet." };
  }

  revalidatePath("/progress");
  return { ok: true, message: "Physique metrics saved to your account.", entry: mapPhysiqueRow(data as Record<string, unknown>) };
}

export async function saveRecoveryLogAction(input: unknown): Promise<EntryActionResult<RecoveryLogEntry>> {
  const parsed = recoveryLogSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Check that recovery log." };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to sync recovery logs to your account." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Log in again to save recovery." };
  }

  const entry = parsed.data;
  const score = calculateRecoveryScore(entry);
  const { data, error } = await supabase
    .from("recovery_logs")
    .upsert(
      {
        user_id: user.id,
        date: entry.date,
        sleep_hours: entry.sleepHours,
        energy: entry.energy,
        soreness: entry.soreness,
        stress: entry.stress,
        workout_rpe: entry.workoutRpe,
        score,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,date" }
    )
    .select("id, date, sleep_hours, energy, soreness, stress, workout_rpe, score")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "We could not save that recovery log yet." };
  }

  revalidatePath("/progress");
  return { ok: true, message: "Recovery log saved to your account.", entry: mapRecoveryRow(data as Record<string, unknown>) };
}

export async function completeTutorialAction(mode: "completed" | "skipped" = "completed"): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: true, message: "Tutorial completed on this device." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Log in again to update tutorial status." };

  const basePayload = {
    user_id: user.id,
    tutorial_completed: true,
    updated_at: new Date().toISOString()
  };
  const payloadWithSkipped = {
    ...basePayload,
    tutorial_skipped: mode === "skipped"
  };

  let { error } = await supabase.from("user_fitness_profiles").upsert(payloadWithSkipped, { onConflict: "user_id" });

  if (error && (error.code === "PGRST204" || error.message.toLowerCase().includes("tutorial_skipped"))) {
    const retry = await supabase.from("user_fitness_profiles").upsert(
      basePayload,
      { onConflict: "user_id" }
    );
    error = retry.error;
  }

  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/workout");
  revalidatePath("/progress");
  revalidatePath("/settings");
  return { ok: true, message: mode === "skipped" ? "Tutorial skipped." : "Tutorial completed." };
}

export async function markChecklistItemAction(item: string): Promise<ActionResult> {
  const allowed = new Set([
    "completedProfile",
    "generatedFirstWorkout",
    "openedInstruction",
    "completedFirstWorkout",
    "loggedFirstPr",
    "visitedProgress"
  ]);

  if (!allowed.has(item)) return { ok: false, message: "Checklist item is not supported." };
  if (!isSupabaseConfigured) return { ok: true, message: "Checklist updated on this device." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Log in again to update checklist." };

  const { data: profile } = await supabase
    .from("user_fitness_profiles")
    .select("checklist_progress")
    .eq("user_id", user.id)
    .maybeSingle();
  const current = (profile?.checklist_progress ?? {}) as Record<string, unknown>;
  const { error } = await supabase.from("user_fitness_profiles").upsert(
    {
      user_id: user.id,
      checklist_progress: {
        ...current,
        [item]: true
      },
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/workout");
  revalidatePath("/progress");
  return { ok: true, message: "Checklist updated." };
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

function debugProgressSync(event: string, details?: Record<string, unknown>) {
  if (process.env.DEBUG_PROGRESS_ANALYTICS === "true") {
    console.debug(`[progress-sync] ${event}`, details ?? {});
  }
}

async function persistCompletedDailyWorkoutHistory({
  supabase,
  userId,
  dailyWorkout
}: {
  supabase: SupabaseServerClient;
  userId: string;
  dailyWorkout: DailyWorkoutRecord;
}): Promise<ActionResult> {
  const workout = dailyWorkout.workout;
  const input = dailyWorkout.inputSnapshot;
  debugProgressSync("completed workout history save attempt", {
    user_id: userId,
    workout_date: dailyWorkout.workoutDate,
    daily_workout_id: dailyWorkout.id,
    title: workout.name,
    exercise_count: workout.exercises.length
  });

  const { data: existingWorkout, error: existingError } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("workout_date", dailyWorkout.workoutDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError && !shouldRetryLegacyWorkoutInsert(existingError)) {
    debugProgressSync("workouts lookup failed", {
      user_id: userId,
      workout_date: dailyWorkout.workoutDate,
      message: existingError.message,
      code: existingError.code
    });
    return { ok: false, message: existingError.message };
  }

  let workoutId = (existingWorkout as { id?: string } | null)?.id ?? null;

  if (!workoutId) {
    const workoutInsert = {
      user_id: userId,
      workout_name: workout.name,
      duration: workout.duration,
      focus: workout.focus,
      intensity: workout.intensity,
      energy: input.energy,
      soreness: input.soreness,
      time_available: input.timeAvailable,
      equipment: input.equipment,
      gym_crowding: input.crowding,
      body_focus: input.bodyFocus,
      warmup: workout.warmup,
      why_it_fits: workout.why,
      condensed_version: workout.condensed,
      completed_exercises: workout.exercises.length,
      workout_date: dailyWorkout.workoutDate,
      readiness_score: workout.readinessScore ?? null,
      training_dose: workout.trainingDose ?? workout.intensity,
      input_snapshot: jsonSafe(input),
      workout_json: jsonSafe(workout),
      explanation: workout.explanation?.whyThisWorkout ?? workout.why.join("\n")
    };

    let workoutResult = await supabase
      .from("workouts")
      .insert(workoutInsert)
      .select("id")
      .single();
    let insertedWorkout = workoutResult.data;
    let workoutError = workoutResult.error;

    if (shouldRetryLegacyWorkoutInsert(workoutError)) {
      const legacyWorkoutInsert = {
        user_id: userId,
        workout_name: workout.name,
        duration: workout.duration,
        focus: workout.focus,
        intensity: workout.intensity,
        energy: input.energy,
        soreness: input.soreness,
        time_available: input.timeAvailable,
        equipment: input.equipment,
        gym_crowding: input.crowding,
        body_focus: input.bodyFocus,
        warmup: workout.warmup,
        why_it_fits: workout.why,
        condensed_version: workout.condensed,
        completed_exercises: workout.exercises.length
      };

      workoutResult = await supabase.from("workouts").insert(legacyWorkoutInsert).select("id").single();
      insertedWorkout = workoutResult.data;
      workoutError = workoutResult.error;
    }

    if (workoutError || !insertedWorkout) {
      debugProgressSync("workouts insert failed", {
        user_id: userId,
        workout_date: dailyWorkout.workoutDate,
        message: workoutError?.message,
        code: workoutError?.code
      });
      return { ok: false, message: workoutError?.message ?? "Completed workout could not be added to history." };
    }

    workoutId = (insertedWorkout as { id: string }).id;

    const { error: exerciseError } = await supabase.from("workout_exercises").insert(
      workout.exercises.map((exercise, index) => ({
        user_id: userId,
        workout_id: workoutId,
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
      debugProgressSync("workout exercises insert failed", {
        user_id: userId,
        workout_id: workoutId,
        message: exerciseError.message,
        code: exerciseError.code
      });
    }
  }

  const { data: existingLog, error: logLookupError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .maybeSingle();

  if (logLookupError) {
    debugProgressSync("workout log lookup failed", {
      user_id: userId,
      workout_id: workoutId,
      message: logLookupError.message,
      code: logLookupError.code
    });
    return { ok: false, message: logLookupError.message };
  }

  if (!existingLog) {
    const { error: logError } = await supabase.from("workout_logs").insert({
      user_id: userId,
      workout_id: workoutId,
      completed_at: new Date().toISOString(),
      duration: workout.duration,
      focus: workout.focus,
      energy: input.energy,
      soreness: input.soreness
    });

    if (logError) {
      debugProgressSync("workout log insert failed", {
        user_id: userId,
        workout_id: workoutId,
        message: logError.message,
        code: logError.code
      });
      return { ok: false, message: logError.message };
    }
  }

  debugProgressSync("completed workout history save success", {
    user_id: userId,
    workout_date: dailyWorkout.workoutDate,
    workout_id: workoutId
  });
  return { ok: true, message: "Workout completed and synced to Progress." };
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
  revalidatePath("/progress");
  return { ok: true, message: "Workout saved. Nice, real-life consistency." };
}
