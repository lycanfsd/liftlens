import { NextResponse, type NextRequest } from "next/server";

import { getMockCoachReply } from "@/lib/workout/coach";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      reply: getMockCoachReply(message),
      mode: "mock"
    });
  }

  // OpenAI-ready placeholder: replace this block with a Responses API call when live coaching is enabled.
  return NextResponse.json({
    reply: getMockCoachReply(message),
    mode: "openai-placeholder"
  });
}
