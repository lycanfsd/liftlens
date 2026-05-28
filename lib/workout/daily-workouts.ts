import "server-only";

import { getLocalDateKey } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyCheckIn, DailyWorkoutRecord, DailyWorkoutStatus, GeneratedWorkout } from "@/lib/types";

export const DAILY_WORKOUTS_TABLE = "daily_workouts";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type DailyWorkoutRow = {
  id: string;
  user_id: string | null;
  workout_date: string;
  input_snapshot: unknown;
  workout_json: unknown;
  readiness_score: number | null;
  training_dose: string | null;
  title: string | null;
  status: string | null;
  version: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DailyWorkoutSaveResult = {
  record: DailyWorkoutRecord | null;
  blockedByExisting: boolean;
  error?: string;
  debugMessage?: string;
  userId?: string | null;
  workoutDate?: string;
};

export type DailyWorkoutLoadResult = {
  record: DailyWorkoutRecord | null;
  error?: string;
  debugMessage: string;
  userId: string | null;
  workoutDate: string;
};

const expectedColumns = [
  "id",
  "user_id",
  "workout_date",
  "input_snapshot",
  "workout_json",
  "readiness_score",
  "training_dose",
  "title",
  "status",
  "version",
  "created_at",
  "updated_at"
];

const dailyWorkoutSelect =
  "id, user_id, workout_date, input_snapshot, workout_json, readiness_score, training_dose, title, status, version, created_at, updated_at";

function devLog(event: string, details: Record<string, unknown>) {
  if (process.env.DEBUG_DAILY_WORKOUT_PERSISTENCE === "true") {
    console.debug(`[daily_workouts] ${event}`, details);
  }
}

export function getWorkoutDateKey(date = new Date()) {
  return getLocalDateKey(date);
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDailyCheckIn(value: unknown): value is DailyCheckIn {
  if (!isObject(value)) return false;

  return (
    typeof value.timeAvailable === "number" &&
    typeof value.energy === "number" &&
    typeof value.soreness === "number" &&
    typeof value.equipment === "string" &&
    typeof value.crowding === "string" &&
    typeof value.bodyFocus === "string"
  );
}

function isGeneratedWorkout(value: unknown): value is GeneratedWorkout {
  if (!isObject(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.duration === "number" &&
    typeof value.focus === "string" &&
    typeof value.intensity === "string" &&
    Array.isArray(value.warmup) &&
    Array.isArray(value.exercises) &&
    Array.isArray(value.why) &&
    Array.isArray(value.condensed)
  );
}

function asDailyWorkoutStatus(value: string | null): DailyWorkoutStatus {
  if (value === "started" || value === "completed" || value === "skipped") return value;
  return "planned";
}

export function rowToDailyWorkoutRecord(row: DailyWorkoutRow | null): DailyWorkoutRecord | null {
  if (!row || !isDailyCheckIn(row.input_snapshot) || !isGeneratedWorkout(row.workout_json)) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    workoutDate: row.workout_date,
    inputSnapshot: row.input_snapshot,
    workout: row.workout_json,
    readinessScore: row.readiness_score,
    trainingDose: row.training_dose,
    title: row.title ?? row.workout_json.name,
    status: asDailyWorkoutStatus(row.status),
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getCurrentUserTodayDailyWorkout(): Promise<DailyWorkoutRecord | null> {
  const result = await getCurrentUserTodayDailyWorkoutResult();
  return result.record;
}

export async function getCurrentUserTodayDailyWorkoutResult(workoutDate = getWorkoutDateKey()): Promise<DailyWorkoutLoadResult> {
  if (!isSupabaseConfigured) {
    const debugMessage = "Load failed: Supabase environment variables are not configured.";
    devLog("load error", {
      table: DAILY_WORKOUTS_TABLE,
      operation: "select today",
      user_id: null,
      workout_date: workoutDate,
      message: debugMessage,
      expectedColumns
    });
    return {
      record: null,
      error: debugMessage,
      debugMessage,
      userId: null,
      workoutDate
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const debugMessage = "Load failed: No authenticated user.";
    devLog("load error", {
      table: DAILY_WORKOUTS_TABLE,
      operation: "select today",
      user_id: null,
      workout_date: workoutDate,
      message: debugMessage,
      expectedColumns
    });
    return {
      record: null,
      error: debugMessage,
      debugMessage,
      userId: null,
      workoutDate
    };
  }

  return getTodayDailyWorkoutForUserResult(supabase, user.id, workoutDate);
}

export async function getTodayDailyWorkoutForUser(
  supabase: SupabaseServerClient,
  userId: string,
  workoutDate = getWorkoutDateKey()
): Promise<DailyWorkoutRecord | null> {
  const result = await getTodayDailyWorkoutForUserResult(supabase, userId, workoutDate);
  return result.record;
}

export async function getTodayDailyWorkoutForUserResult(
  supabase: SupabaseServerClient,
  userId: string,
  workoutDate = getWorkoutDateKey()
): Promise<DailyWorkoutLoadResult> {
  devLog("load attempt", {
    table: DAILY_WORKOUTS_TABLE,
    operation: "select today",
    user_id: userId,
    workout_date: workoutDate,
    expectedColumns
  });

  const { data, error } = await supabase
    .from(DAILY_WORKOUTS_TABLE)
    .select(dailyWorkoutSelect)
    .eq("user_id", userId)
    .eq("workout_date", workoutDate)
    .maybeSingle();

  if (error) {
    const debugMessage = `Load failed: ${error.message}`;
    devLog("load error", {
      table: DAILY_WORKOUTS_TABLE,
      operation: "select today",
      user_id: userId,
      workout_date: workoutDate,
      message: error.message,
      code: error.code,
      expectedColumns
    });
    return {
      record: null,
      error: error.message,
      debugMessage,
      userId,
      workoutDate
    };
  }

  const record = rowToDailyWorkoutRecord((data as DailyWorkoutRow | null) ?? null);

  if (data && !record) {
    const debugMessage = "Load failed: daily_workouts row exists but workout_json or input_snapshot shape is invalid.";
    devLog("load row shape invalid", {
      table: DAILY_WORKOUTS_TABLE,
      operation: "select today",
      user_id: userId,
      workout_date: workoutDate,
      returnedRowId: (data as DailyWorkoutRow).id,
      expectedColumns
    });
    return {
      record: null,
      error: debugMessage,
      debugMessage,
      userId,
      workoutDate
    };
  }

  const debugMessage = record ? `Saved workout loaded: ${record.id}` : "No saved workout found for today.";
  devLog("load success", {
    table: DAILY_WORKOUTS_TABLE,
    operation: "select today",
    user_id: userId,
    workout_date: workoutDate,
    returnedRowId: record?.id ?? null,
    expectedColumns
  });

  return {
    record,
    debugMessage,
    userId,
    workoutDate
  };
}

export async function saveTodayDailyWorkoutForUser({
  supabase,
  userId,
  input,
  workout,
  overwriteExisting = false,
  workoutDate = getWorkoutDateKey()
}: {
  supabase: SupabaseServerClient;
  userId: string;
  input: DailyCheckIn;
  workout: GeneratedWorkout;
  overwriteExisting?: boolean;
  workoutDate?: string;
}): Promise<DailyWorkoutSaveResult> {
  devLog("save attempt", {
    table: DAILY_WORKOUTS_TABLE,
    operation: overwriteExisting ? "upsert/update today" : "insert today",
    user_id: userId,
    workout_date: workoutDate,
    title: workout.name,
    expectedColumns
  });

  const existing = await getTodayDailyWorkoutForUser(supabase, userId, workoutDate);

  if (existing && !overwriteExisting) {
    devLog("save blocked existing", {
      table: DAILY_WORKOUTS_TABLE,
      operation: "insert today",
      user_id: userId,
      workout_date: workoutDate,
      returnedRowId: existing.id,
      expectedColumns
    });
    return {
      record: existing,
      blockedByExisting: true,
      debugMessage: `Saved workout loaded: ${existing.id}`,
      userId,
      workoutDate
    };
  }

  const payload = {
    user_id: userId,
    workout_date: workoutDate,
    input_snapshot: jsonSafe(input),
    workout_json: jsonSafe(workout),
    readiness_score: workout.readinessScore ?? null,
    training_dose: workout.trainingDose ?? workout.intensity,
    title: workout.name,
    status: existing?.status === "started" ? "started" : "planned",
    version: existing ? existing.version + 1 : 1,
    updated_at: new Date().toISOString()
  };

  const query = existing
    ? supabase.from(DAILY_WORKOUTS_TABLE).update(payload).eq("id", existing.id)
    : supabase.from(DAILY_WORKOUTS_TABLE).insert(payload);

  const { data, error } = await query.select(dailyWorkoutSelect).single();

  if (error) {
    const debugMessage = `Save failed: ${error.message}`;
    devLog("save error", {
      table: DAILY_WORKOUTS_TABLE,
      operation: existing ? "update today" : "insert today",
      user_id: userId,
      workout_date: workoutDate,
      message: error.message,
      code: error.code,
      expectedColumns
    });

    return {
      record: existing,
      blockedByExisting: false,
      error: error.message,
      debugMessage,
      userId,
      workoutDate
    };
  }

  const record = rowToDailyWorkoutRecord(data as DailyWorkoutRow);

  if (!record) {
    const debugMessage = "Save failed: saved daily_workouts row returned with invalid JSON shape.";
    devLog("save row shape invalid", {
      table: DAILY_WORKOUTS_TABLE,
      operation: existing ? "update today" : "insert today",
      user_id: userId,
      workout_date: workoutDate,
      returnedRowId: (data as DailyWorkoutRow | null)?.id ?? null,
      expectedColumns
    });
    return {
      record: existing,
      blockedByExisting: false,
      error: debugMessage,
      debugMessage,
      userId,
      workoutDate
    };
  }

  devLog("save success", {
    table: DAILY_WORKOUTS_TABLE,
    operation: existing ? "update today" : "insert today",
    user_id: userId,
    workout_date: workoutDate,
    returnedRowId: record.id,
    expectedColumns
  });

  return {
    record,
    blockedByExisting: false,
    debugMessage: `Workout saved: ${record.id}`,
    userId,
    workoutDate
  };
}

export async function updateTodayDailyWorkoutStatusForUser({
  supabase,
  userId,
  status,
  workoutId,
  workoutDate = getWorkoutDateKey()
}: {
  supabase: SupabaseServerClient;
  userId: string;
  status: DailyWorkoutStatus;
  workoutId?: string | null;
  workoutDate?: string;
}): Promise<DailyWorkoutSaveResult> {
  devLog("save attempt", {
    table: DAILY_WORKOUTS_TABLE,
    operation: "update status",
    user_id: userId,
    workout_date: workoutDate,
    status,
    workout_id: workoutId ?? null,
    expectedColumns
  });

  const query = supabase
    .from(DAILY_WORKOUTS_TABLE)
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  const scopedQuery = workoutId ? query.eq("id", workoutId) : query.eq("workout_date", workoutDate);
  const { data, error } = await scopedQuery.select(dailyWorkoutSelect).single();

  if (error) {
    const debugMessage = `Save failed: ${error.message}`;
    devLog("status update error", {
      table: DAILY_WORKOUTS_TABLE,
      operation: "update status",
      user_id: userId,
      workout_date: workoutDate,
      message: error.message,
      code: error.code,
      expectedColumns: ["id", "user_id", "workout_date", "status", "updated_at"]
    });

    return {
      record: null,
      blockedByExisting: false,
      error: error.message,
      debugMessage,
      userId,
      workoutDate
    };
  }

  const record = rowToDailyWorkoutRecord(data as DailyWorkoutRow);
  devLog("save success", {
    table: DAILY_WORKOUTS_TABLE,
    operation: "update status",
    user_id: userId,
    workout_date: workoutDate,
    returnedRowId: record?.id ?? null,
    expectedColumns
  });

  return {
    record,
    blockedByExisting: false,
    debugMessage: record ? `Workout saved: ${record.id}` : "Save failed: status update returned no valid row.",
    userId,
    workoutDate
  };
}
