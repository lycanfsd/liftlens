import type { WeakPoint, WeakPointPlan } from "@/lib/types";

export function getWeakPointPlan(weakPoint: WeakPoint): WeakPointPlan {
  const plans: Record<WeakPoint, WeakPointPlan> = {
    chest: {
      weakPoint: "chest",
      accessories: ["Incline dumbbell press: 3 x 8-12", "Slow push-up: 2 x near-technical-failure"],
      frequency: "Add after two upper or full-body days each week.",
      commonMistakes: ["Letting shoulders roll forward", "Bouncing out of the bottom", "Only training flat pressing"],
      progressMetric: "Track total clean pressing reps across the week."
    },
    shoulders: {
      weakPoint: "shoulders",
      accessories: ["Cable or dumbbell lateral raise: 3 x 12-20", "Half-kneeling shoulder press: 3 x 8-10"],
      frequency: "Train small shoulder work 2-3 times weekly, away from heavy fatigue.",
      commonMistakes: ["Going too heavy on raises", "Shrugging every rep", "Ignoring rear delts"],
      progressMetric: "Track strict lateral raise reps at the same weight."
    },
    arms: {
      weakPoint: "arms",
      accessories: ["Hammer curl: 3 x 10-12", "Overhead triceps extension: 3 x 10-15"],
      frequency: "Place after pull and push sessions, twice weekly.",
      commonMistakes: ["Rushing eccentrics", "Turning every curl into a swing", "Skipping full elbow extension"],
      progressMetric: "Track weekly direct arm sets completed."
    },
    back: {
      weakPoint: "back",
      accessories: ["Chest-supported row: 3 x 8-12", "Straight-arm pulldown: 2 x 12-15"],
      frequency: "Add a row or pulldown pattern to two weekly sessions.",
      commonMistakes: ["Pulling with biceps first", "Losing shoulder blade control", "Never pausing the squeeze"],
      progressMetric: "Track controlled reps with a one-second squeeze."
    },
    legs: {
      weakPoint: "legs",
      accessories: ["Bulgarian split squat: 3 x 8 per side", "Leg curl or sliding hamstring curl: 3 x 10-12"],
      frequency: "Use one quad-biased and one hamstring-biased accessory each week.",
      commonMistakes: ["Changing exercises too often", "Skipping unilateral work", "Cutting range of motion short"],
      progressMetric: "Track split squat reps per side at the same load."
    },
    quads: {
      weakPoint: "quads",
      accessories: ["Front-foot elevated split squat: 3 x 8 per side", "Leg extension or tempo squat: 3 x 10-15"],
      frequency: "Add one quad-biased accessory after lower days twice weekly.",
      commonMistakes: ["Letting hips shoot back", "Rushing the eccentric", "Cutting knee range short"],
      progressMetric: "Track controlled quad-biased reps at the same load."
    },
    hamstrings: {
      weakPoint: "hamstrings",
      accessories: ["Romanian deadlift: 3 x 8-10", "Leg curl or sliding hamstring curl: 3 x 10-12"],
      frequency: "Use one hinge and one curl pattern across the week.",
      commonMistakes: ["Turning hinges into squats", "Losing neutral spine", "Skipping slow eccentrics"],
      progressMetric: "Track clean hinge reps and curl reps week to week."
    },
    glutes: {
      weakPoint: "glutes",
      accessories: ["Hip thrust or glute bridge: 3 x 8-12", "Cable kickback or band abduction: 2 x 15-20"],
      frequency: "Add glute work after lower days, twice weekly.",
      commonMistakes: ["Overarching the low back", "Skipping the lockout squeeze", "Only doing very light bands"],
      progressMetric: "Track hip thrust load plus clean top-position pauses."
    },
    calves: {
      weakPoint: "calves",
      accessories: ["Standing calf raise: 4 x 8-12", "Seated or bent-knee calf raise: 3 x 12-20"],
      frequency: "Train calves in short blocks 2-3 times weekly.",
      commonMistakes: ["Bouncing reps", "Skipping the stretched pause", "Only training straight-knee raises"],
      progressMetric: "Track full-range calf raise reps with a bottom pause."
    },
    core: {
      weakPoint: "core",
      accessories: ["Dead bug: 3 x 6 per side", "Side plank: 3 x 20-45 sec per side"],
      frequency: "Use short core finishers 3 times weekly.",
      commonMistakes: ["Chasing burn instead of control", "Holding breath", "Only training crunching patterns"],
      progressMetric: "Track controlled seconds without rib flare."
    },
    conditioning: {
      weakPoint: "conditioning",
      accessories: ["Zone 2 incline walk: 20 minutes", "Bike intervals: 8 rounds of 30 sec hard / 60 sec easy"],
      frequency: "One easy engine day and one short interval day weekly.",
      commonMistakes: ["Making every session maximal", "Skipping warmups", "Not separating conditioning from heavy leg fatigue"],
      progressMetric: "Track heart-rate recovery one minute after intervals."
    }
  };

  return plans[weakPoint];
}
