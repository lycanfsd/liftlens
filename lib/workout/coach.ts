export function getMockCoachReply(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("20") || lower.includes("minutes") || lower.includes("time")) {
    return "Go 20-minute minimum effective dose: 3-minute warmup, then 3 rounds of squat or hinge, push, pull, and core. Keep rests short. Today counts.";
  }

  if (lower.includes("legs") && (lower.includes("sore") || lower.includes("hurt"))) {
    return "Low energy or sore legs does not mean no progress. Shift to upper body, core, or easy Zone 2 today. Avoid sharp pain and skip heavy lower work until soreness settles.";
  }

  if (lower.includes("eat") || lower.includes("meal") || lower.includes("protein")) {
    return "After lifting, aim for protein plus carbs: Greek yogurt with fruit, chicken rice bowl, eggs and toast, or a protein smoothie. Keep it simple enough to repeat.";
  }

  if (lower.includes("packed") || lower.includes("crowded") || lower.includes("busy gym")) {
    return "Packed gym? We'll work around it. Choose dumbbells, bodyweight, or a single bench corner. Pair movements you can do in one spot and skip machines with long waits.";
  }

  if (lower.includes("miss") || lower.includes("skipped")) {
    return "No guilt. Adjust and keep going. Do 80% of the next workout, avoid revenge volume, and protect the next training window on your calendar.";
  }

  return "Today's plan should fit today's life. Tell me your time, energy, soreness, and equipment, and I'll help you choose the smallest workout that still moves you forward.";
}
