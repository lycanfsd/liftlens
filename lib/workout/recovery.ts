import type { RecoveryPlan, RecoveryWindow } from "@/lib/types";

export function getRecoveryPlan(window: RecoveryWindow): RecoveryPlan {
  if (window === "1-day") {
    return {
      title: "One-Day Reset",
      reassurance: "No guilt. We just adjust and keep moving.",
      today: [
        "Resume the planned workout at 85% volume.",
        "Pick one fewer accessory if time is tight.",
        "Keep the warmup, because it rebuilds momentum fast."
      ],
      nextWorkout: [
        "Return to normal intensity if sleep and soreness feel steady.",
        "Avoid stacking two hard sessions back to back just to make up for it."
      ],
      weeklyReset: [
        "Protect the next two training windows on your calendar.",
        "Plan a 15-minute fallback option for the busiest day."
      ]
    };
  }

  if (window === "2-3-days") {
    return {
      title: "Soft Re-Entry",
      reassurance: "You did not lose progress. Today is about restarting the loop.",
      today: [
        "Choose a full-body session with 2-3 sets per movement.",
        "Stop each set with two reps in reserve.",
        "Finish feeling better than when you started."
      ],
      nextWorkout: [
        "Train the area you missed most, but cap accessories at two.",
        "Use moderate loads before returning to heavy work."
      ],
      weeklyReset: [
        "Keep the week to 3 focused sessions.",
        "Add a walk or mobility block on a non-lifting day."
      ]
    };
  }

  return {
    title: "Fresh Start Week",
    reassurance: "A break is data, not a verdict. The plan adapts.",
    today: [
      "Start with a 25-35 minute full-body session.",
      "Use lighter loads and make every rep clean.",
      "Skip max-effort sets until rhythm returns."
    ],
    nextWorkout: [
      "Repeat the same movement patterns before increasing load.",
      "Aim for consistency first, performance second."
    ],
    weeklyReset: [
      "Schedule two must-do sessions and one optional session.",
      "Prep one easy protein meal so recovery is not another decision."
    ]
  };
}
