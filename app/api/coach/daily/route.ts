import { NextResponse } from "next/server";

import { APP_NAME } from "@/lib/brand";
import { normalizePlanType, type PlanType } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectivePlanType, hasPremiumAccess } from "@/lib/subscription";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_DAILY_COACH_MODEL = "gpt-4.1-mini";
const DAILY_AI_MESSAGES_TABLE = "daily_ai_messages";
const DAILY_AI_MESSAGES_COLUMNS = [
  "id",
  "user_id",
  "message_date",
  "content",
  "source",
  "plan_type",
  "dismissed_at",
  "metadata",
  "created_at",
  "updated_at"
];
const DAILY_AI_MESSAGES_SELECT = DAILY_AI_MESSAGES_COLUMNS.join(", ");
const PROFILE_COLUMNS = [
  "plan_type",
  "primary_goal",
  "weekly_training_days",
  "preferred_workout_length",
  "equipment_access",
  "biggest_struggle"
];
const WORKOUT_LOG_COLUMNS = ["completed_at", "focus", "energy", "soreness", "duration"];

type DailyMessageSource = "fake" | "openai" | "fallback";

type ProfileContext = {
  plan_type?: unknown;
  primary_goal?: string | null;
  weekly_training_days?: number | null;
  preferred_workout_length?: number | null;
  equipment_access?: string | null;
  biggest_struggle?: string | null;
};

type WorkoutLogContext = {
  completed_at: string;
  focus: string | null;
  energy: number | null;
  soreness: number | null;
  duration: number | null;
};

type DailyCoachMessageRow = {
  id: string;
  user_id: string;
  message_date: string;
  content: string;
  source: DailyMessageSource;
  plan_type: string | null;
  dismissed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type WorkoutContext = {
  completedThisWeek: number;
  lastFocus: string;
  averageEnergy: number;
  averageSoreness: number;
  averageDuration: number;
  consistencyPercent: number;
  primaryGoal: string;
  weeklyTarget: number;
  preferredLength: number;
  equipmentAccess: string;
  biggestStruggle: string;
  hasRealLogs: boolean;
};

type AuthenticatedRequest = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
};

type SupabaseQueryError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  name?: string;
};

function logSupabaseError({
  error,
  expectedColumns,
  operation,
  table
}: {
  error: unknown;
  expectedColumns: string[];
  operation: string;
  table: string;
}) {
  const supabaseError = error as SupabaseQueryError;

  console.error("[/api/coach/daily] Supabase operation failed", {
    operation,
    table,
    expectedColumns,
    message: supabaseError.message ?? "Unknown Supabase error",
    code: supabaseError.code ?? "unknown",
    details: supabaseError.details ?? null,
    hint: supabaseError.hint ?? null,
    name: supabaseError.name ?? null
  });
}

function logUnexpectedError(operation: string, error: unknown) {
  console.error("[/api/coach/daily] Unexpected server error", {
    operation,
    table: DAILY_AI_MESSAGES_TABLE,
    expectedColumns: DAILY_AI_MESSAGES_COLUMNS,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null
  });
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getServerDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMessageDateFromRequest(request: Request, bodyDate?: unknown) {
  if (isDateKey(bodyDate)) return bodyDate;

  const urlDate = new URL(request.url).searchParams.get("date");
  if (isDateKey(urlDate)) return urlDate;

  return getServerDateKey();
}

function toPayload(row: DailyCoachMessageRow) {
  return {
    message: {
      id: row.id,
      messageDate: row.message_date,
      content: row.content,
      source: row.source,
      planType: normalizePlanType(row.plan_type),
      dismissedAt: row.dismissed_at,
      createdAt: row.created_at
    }
  };
}

function getResponseText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;

  const maybeOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === "string") return maybeOutputText.trim();

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

async function authenticate(): Promise<
  | { ok: true; value: AuthenticatedRequest }
  | { ok: false; status: number; error: string }
> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      status: 503,
      error: "Supabase is not configured yet, so daily coach messages cannot be saved."
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (error) {
      logSupabaseError({
        error,
        operation: "get authenticated user for daily AI coach message",
        table: "auth.users",
        expectedColumns: ["id", "email"]
      });
    }

    return {
      ok: false,
      status: 401,
      error: "Log in to get your daily coach message."
    };
  }

  return { ok: true, value: { supabase, userId: user.id } };
}

function buildWorkoutContext(profile: ProfileContext | null, logs: WorkoutLogContext[]): WorkoutContext {
  const now = Date.now();
  const weekLogs = logs.filter((log) => now - new Date(log.completed_at).getTime() <= 7 * 86400000);
  const weeklyTarget = Math.max(1, profile?.weekly_training_days ?? 4);
  const completedThisWeek = weekLogs.length || 2;
  const averageEnergy =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.energy ?? 3), 0) / logs.length
      : 3.6;
  const averageSoreness =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.soreness ?? 3), 0) / logs.length
      : 2.4;
  const averageDuration =
    logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.duration ?? profile?.preferred_workout_length ?? 35), 0) /
        logs.length
      : 34;

  return {
    completedThisWeek,
    lastFocus: logs[0]?.focus ?? "Full body",
    averageEnergy: Number(averageEnergy.toFixed(1)),
    averageSoreness: Number(averageSoreness.toFixed(1)),
    averageDuration: Math.round(averageDuration),
    consistencyPercent: Math.min(100, Math.round((completedThisWeek / weeklyTarget) * 100)),
    primaryGoal: profile?.primary_goal ?? "general fitness",
    weeklyTarget,
    preferredLength: profile?.preferred_workout_length ?? 35,
    equipmentAccess: profile?.equipment_access ?? "full gym",
    biggestStruggle: profile?.biggest_struggle ?? "time",
    hasRealLogs: logs.length > 0
  };
}

function generateFakeCoachMessage(context: WorkoutContext) {
  if (context.averageEnergy <= 2.8) {
    return `Today's note: keep the bar low enough to start. You are ${context.completedThisWeek}/${context.weeklyTarget} sessions into the week, so a ${Math.min(context.preferredLength, 25)}-minute ${context.lastFocus.toLowerCase()} session with 1-2 reps in reserve still counts as a real win. Low energy does not mean no progress.`;
  }

  if (context.averageSoreness >= 3.6) {
    return `Today's note: protect recovery while keeping the habit alive. Your recent soreness is trending higher, so aim for clean reps, lighter accessories, and a shorter warmup-to-work ratio. No guilt, just adjust and keep moving.`;
  }

  return `Today's note: you are on track at ${context.consistencyPercent}% weekly consistency. Build around your last ${context.lastFocus.toLowerCase()} session, keep one strong lift, and let the rest of the workout fit today's schedule. Today's plan should feel doable before it feels impressive.`;
}

function generateFallbackCoachMessage(context: WorkoutContext) {
  return `Today's coach note is running in fallback mode: choose the smallest useful session you can finish. With ${context.completedThisWeek}/${context.weeklyTarget} workouts logged this week, the win is consistency first, then intensity.`;
}

async function getWorkoutContext(
  supabase: AuthenticatedRequest["supabase"],
  userId: string,
  profile: ProfileContext | null
) {
  const { data, error } = await supabase
    .from("workout_logs")
    .select(WORKOUT_LOG_COLUMNS.join(", "))
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(14);

  if (error) {
    logSupabaseError({
      error,
      operation: "select recent workout logs for daily AI context",
      table: "workout_logs",
      expectedColumns: WORKOUT_LOG_COLUMNS
    });
  }

  return buildWorkoutContext(profile, (data ?? []) as unknown as WorkoutLogContext[]);
}

async function generateOpenAiCoachMessage(context: WorkoutContext) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_DAILY_COACH_MODEL ?? DEFAULT_DAILY_COACH_MODEL,
      store: false,
      input: [
        {
          role: "system",
          content: `You are ${APP_NAME}, a supportive premium fitness coach for busy people. Write one concise daily dashboard message. Do not give medical advice or diagnose injuries. Keep it confident, specific, and under 90 words.`
        },
        {
          role: "user",
          content: `Create today's daily coach message from this context: ${JSON.stringify(context)}. Emphasize adaptive training, consistency, and one clear next action.`
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  return getResponseText(payload);
}

async function saveDailyMessage(
  supabase: AuthenticatedRequest["supabase"],
  userId: string,
  messageDate: string,
  planType: PlanType,
  content: string,
  source: DailyMessageSource,
  context: WorkoutContext
) {
  const { data, error } = await supabase
    .from(DAILY_AI_MESSAGES_TABLE)
    .upsert(
      {
        user_id: userId,
        message_date: messageDate,
        content,
        source,
        plan_type: planType.toLowerCase(),
        metadata: {
          context,
          devFakeAi: process.env.DEV_FAKE_AI === "true"
        }
      },
      { onConflict: "user_id,message_date" }
    )
    .select(DAILY_AI_MESSAGES_SELECT)
    .single();

  if (error || !data) {
    if (error) {
      logSupabaseError({
        error,
        operation: "upsert today's daily AI coach message",
        table: DAILY_AI_MESSAGES_TABLE,
        expectedColumns: DAILY_AI_MESSAGES_COLUMNS
      });
    }

    return { data: null, error: error?.message ?? "Could not save today's coach message." };
  }

  return { data: data as unknown as DailyCoachMessageRow, error: null };
}

async function handleGetDailyCoachMessage(request: Request) {
  const auth = await authenticate();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth.value;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS.join(", "))
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    logSupabaseError({
      error: profileError,
      operation: "select profile fields for daily AI access and personalization",
      table: "profiles",
      expectedColumns: PROFILE_COLUMNS
    });

    return NextResponse.json(
      { error: "We could not load your plan details for today's coach message." },
      { status: 500 }
    );
  }

  const profileContext = (profile ?? null) as ProfileContext | null;
  const planType = normalizePlanType(profileContext?.plan_type);
  const premiumAccess = hasPremiumAccess(planType);

  if (!premiumAccess) {
    return NextResponse.json(
      {
        gated: true,
        planType,
        error: "Daily AI Coach Message is a Pro feature. Upgrade to Pro for a fresh adaptive note each day."
      },
      { status: 403 }
    );
  }

  const messageDate = getMessageDateFromRequest(request);
  const { data: existing, error: existingError } = await supabase
    .from(DAILY_AI_MESSAGES_TABLE)
    .select(DAILY_AI_MESSAGES_SELECT)
    .eq("user_id", userId)
    .eq("message_date", messageDate)
    .maybeSingle();

  if (existingError) {
    logSupabaseError({
      error: existingError,
      operation: "select today's daily AI coach message",
      table: DAILY_AI_MESSAGES_TABLE,
      expectedColumns: DAILY_AI_MESSAGES_COLUMNS
    });

    return NextResponse.json(
      { error: "Daily coach messages are not ready yet. Run the latest Supabase schema and try again." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(toPayload(existing as unknown as DailyCoachMessageRow));
  }

  const context = await getWorkoutContext(supabase, userId, profileContext);
  const effectivePlanType = getEffectivePlanType(planType);
  let source: DailyMessageSource = "fake";
  let content = generateFakeCoachMessage(context);

  if (process.env.DEV_FAKE_AI !== "true") {
    const aiMessage = await generateOpenAiCoachMessage(context).catch(() => null);

    if (aiMessage) {
      source = "openai";
      content = aiMessage;
    } else {
      source = "fallback";
      content = generateFallbackCoachMessage(context);
    }
  }

  const saved = await saveDailyMessage(supabase, userId, messageDate, effectivePlanType, content, source, context);

  if (saved.error || !saved.data) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }

  return NextResponse.json(toPayload(saved.data));
}

export async function GET(request: Request) {
  try {
    return await handleGetDailyCoachMessage(request);
  } catch (error) {
    logUnexpectedError("GET /api/coach/daily", error);
    return NextResponse.json(
      { error: "Daily coach message failed on the server. Check the server logs for the Supabase details." },
      { status: 500 }
    );
  }
}

async function handleDismissDailyCoachMessage(request: Request) {
  const auth = await authenticate();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as { action?: string; messageDate?: string } | null;
  if (body?.action !== "dismiss") {
    return NextResponse.json({ error: "Choose a valid daily coach message action." }, { status: 400 });
  }

  const messageDate = getMessageDateFromRequest(request, body.messageDate);
  const { supabase, userId } = auth.value;
  const { data, error } = await supabase
    .from(DAILY_AI_MESSAGES_TABLE)
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("message_date", messageDate)
    .select(DAILY_AI_MESSAGES_SELECT)
    .maybeSingle();

  if (error) {
    logSupabaseError({
      error,
      operation: "dismiss today's daily AI coach message",
      table: DAILY_AI_MESSAGES_TABLE,
      expectedColumns: DAILY_AI_MESSAGES_COLUMNS
    });

    return NextResponse.json(
      { error: "We could not dismiss today's coach message. Please try again." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Today's coach message has not been generated yet." }, { status: 404 });
  }

  return NextResponse.json(toPayload(data as unknown as DailyCoachMessageRow));
}

export async function PATCH(request: Request) {
  try {
    return await handleDismissDailyCoachMessage(request);
  } catch (error) {
    logUnexpectedError("PATCH /api/coach/daily", error);
    return NextResponse.json(
      { error: "Daily coach message failed on the server. Check the server logs for the Supabase details." },
      { status: 500 }
    );
  }
}
