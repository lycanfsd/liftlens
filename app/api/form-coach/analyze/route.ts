import { NextResponse } from "next/server";
import { z } from "zod";

import { formCoachExercises, isFormCoachExercise, type FormCoachExercise } from "@/lib/form-coach";
import { isPaidPlan, normalizePlanType } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_FORM_COACH_MODEL = "gpt-4.1-mini";

const analyzeSchema = z.object({
  exercise: z.string(),
  frames: z
    .array(
      z
        .string()
        .startsWith("data:image/", "Frames must be base64 image data URLs.")
        .max(1_250_000, "Each frame must stay under 1.25MB.")
    )
    .min(3, "Extract at least 3 frames before analysis.")
    .max(5, "Send at most 5 frames for one analysis.")
});

const openAiFormSchema = z.object({
  form_score: z.number().int().min(0).max(100),
  positives: z.array(z.string()).min(1).max(5),
  corrections: z.array(z.string()).min(1).max(5),
  safety_warnings: z.array(z.string()).min(1).max(5),
  next_cues: z.array(z.string()).min(1).max(5),
  filming_quality: z.string().min(1),
  uncertainty: z.string().min(1),
  should_refilm: z.boolean(),
  regression_progression: z.string().min(1),
  filming_tips: z.array(z.string()).min(1).max(5)
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    form_score: {
      type: "integer",
      description: "0-100 score based only on visible movement quality and filming clarity."
    },
    positives: {
      type: "array",
      items: { type: "string" },
      description: "Three visible things the lifter did well."
    },
    corrections: {
      type: "array",
      items: { type: "string" },
      description: "Three visible technique corrections for the next set."
    },
    safety_warnings: {
      type: "array",
      items: { type: "string" },
      description: "Safety-focused warnings without medical diagnosis."
    },
    next_cues: {
      type: "array",
      items: { type: "string" },
      description: "Short memorable cues for the next set."
    },
    filming_quality: {
      type: "string",
      description: "Clear, limited, or poor, with a short reason."
    },
    uncertainty: {
      type: "string",
      description: "What cannot be assessed from the provided camera angle or frames."
    },
    should_refilm: {
      type: "boolean",
      description: "True when the footage is too unclear for useful feedback."
    },
    regression_progression: {
      type: "string",
      description: "One safer regression or progression recommendation for the next set."
    },
    filming_tips: {
      type: "array",
      items: { type: "string" },
      description: "How to film better next time, especially side/front angle guidance."
    }
  },
  required: [
    "form_score",
    "positives",
    "corrections",
    "safety_warnings",
    "next_cues",
    "filming_quality",
    "uncertainty",
    "should_refilm",
    "regression_progression",
    "filming_tips"
  ]
};

function getExerciseLabel(value: FormCoachExercise) {
  return formCoachExercises.find((exercise) => exercise.value === value)?.label ?? value;
}

function getResponseText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;
  const maybeOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === "string") return maybeOutputText;

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

function normalizeAnalysis(exercise: FormCoachExercise, value: z.infer<typeof openAiFormSchema>) {
  return {
    exercise,
    formScore: value.form_score,
    positives: value.positives.slice(0, 3),
    corrections: value.corrections.slice(0, 3),
    safetyWarnings: value.safety_warnings,
    nextCues: value.next_cues,
    filmingQuality: value.filming_quality,
    uncertainty: value.uncertainty,
    shouldRefilm: value.should_refilm,
    regressionProgression: value.regression_progression,
    filmingTips: value.filming_tips
  };
}

async function authorizeFormCoachAccess() {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      status: 403,
      message: "AI Form Coach is a Pro feature. Upgrade to Pro to analyze lifting videos."
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      message: "Log in with a Pro or Elite account to use AI Form Coach."
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const planType = normalizePlanType((profile as { plan_type?: unknown } | null)?.plan_type);

  if (!isPaidPlan(planType)) {
    return {
      ok: false,
      status: 403,
      message: "AI Form Coach is a Pro feature. Upgrade to Pro to unlock form analysis."
    };
  }

  return { ok: true, status: 200, message: "" };
}

export async function POST(request: Request) {
  const access = await authorizeFormCoachAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const parsed = analyzeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || !isFormCoachExercise(parsed.data.exercise)) {
    return NextResponse.json(
      { error: parsed.error?.errors[0]?.message ?? "Choose a supported exercise before analyzing form." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI vision analysis is not configured yet. Add OPENAI_API_KEY and try again." },
      { status: 503 }
    );
  }

  const exercise = parsed.data.exercise;
  const exerciseLabel = getExerciseLabel(exercise);

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FORM_COACH_MODEL ?? DEFAULT_FORM_COACH_MODEL,
      store: false,
      input: [
        {
          role: "system",
          content:
            "You are FlexFit AI Form Coach, a safety-first strength coach. Analyze only what is visible in the supplied video frames. Do not diagnose injuries or medical conditions. If the camera angle, crop, blur, or missing range of motion makes the analysis uncertain, clearly say so and ask the user to re-film from a side or front 45-degree angle. Return JSON only."
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Exercise: ${exerciseLabel}. Analyze these key frames from one lifting set. Focus on visible form issues only. Provide exactly 3 positives, exactly 3 corrections, safety warnings, next-set cues, filming quality, uncertainty, whether the user should re-film, and one regression/progression. Never diagnose injury.`
            },
            ...parsed.data.frames.map((frame, index) => ({
              type: "input_image",
              image_url: frame,
              detail: index === 0 ? "high" : "low"
            }))
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "form_coach_analysis",
          strict: true,
          schema: responseJsonSchema
        }
      }
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload && "error" in payload
        ? ((payload as { error?: { message?: string } }).error?.message ?? "OpenAI analysis failed.")
        : "OpenAI analysis failed.";

    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  const outputText = getResponseText(payload);
  if (!outputText) {
    return NextResponse.json({ error: "OpenAI returned an empty form analysis." }, { status: 502 });
  }

  let parsedOutput: unknown;
  try {
    parsedOutput = JSON.parse(outputText);
  } catch {
    return NextResponse.json(
      { error: "OpenAI returned form feedback that was not valid JSON. Please try again." },
      { status: 502 }
    );
  }

  const decoded = openAiFormSchema.safeParse(parsedOutput);
  if (!decoded.success) {
    return NextResponse.json(
      { error: "OpenAI returned form feedback in an unexpected shape. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    analysis: normalizeAnalysis(exercise, decoded.data),
    raw: decoded.data
  });
}
