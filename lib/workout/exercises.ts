import type { BodyFocus, EquipmentAccess, ExercisePrescription, WeakPoint } from "@/lib/types";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "isolation"
  | "anti-extension"
  | "anti-rotation"
  | "locomotion"
  | "conditioning";

export type ExerciseTemplate = Omit<
  ExercisePrescription,
  | "sets"
  | "reps"
  | "rest"
  | "substitution"
  | "targetRir"
  | "targetRpe"
  | "tempo"
  | "stimulusToFatigue"
  | "progressionRule"
  | "adaptation"
> & {
  focus: BodyFocus[];
  movementPattern: MovementPattern;
  stabilityDemand: 1 | 2 | 3 | 4 | 5;
  fatigueScore: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3;
  substituteOptions: string[];
  hypertrophyRating: 1 | 2 | 3 | 4 | 5;
  strengthRating: 1 | 2 | 3 | 4 | 5;
};

export const exerciseLibrary: ExerciseTemplate[] = [
  {
    name: "Back squat",
    muscleGroup: "legs",
    equipment: "barbell",
    focus: ["lower", "full-body"],
    movementPattern: "squat",
    stabilityDemand: 4,
    fatigueScore: 5,
    difficulty: 3,
    hypertrophyRating: 5,
    strengthRating: 5,
    cue: "Brace before the descent, keep pressure through the whole foot, and stop before reps grind.",
    substituteOptions: ["Front squat", "Goblet squat", "Tempo bodyweight squat"]
  },
  {
    name: "Trap bar deadlift",
    muscleGroup: "glutes",
    equipment: "barbell",
    focus: ["lower", "full-body"],
    movementPattern: "hinge",
    stabilityDemand: 3,
    fatigueScore: 5,
    difficulty: 3,
    hypertrophyRating: 4,
    strengthRating: 5,
    cue: "Push the floor away, keep lats tight, and finish tall without leaning back.",
    substituteOptions: ["Dumbbell Romanian deadlift", "Hip thrust", "Glute bridge"]
  },
  {
    name: "Goblet squat",
    muscleGroup: "legs",
    equipment: "dumbbells-only",
    focus: ["lower", "full-body"],
    movementPattern: "squat",
    stabilityDemand: 2,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 4,
    strengthRating: 2,
    cue: "Stay tall, keep the weight close, and leave the last rep clean.",
    substituteOptions: ["Tempo bodyweight squat", "Split squat hold", "Step-up"]
  },
  {
    name: "Dumbbell Romanian deadlift",
    muscleGroup: "glutes",
    equipment: "dumbbells-only",
    focus: ["lower", "full-body"],
    movementPattern: "hinge",
    stabilityDemand: 2,
    fatigueScore: 3,
    difficulty: 2,
    hypertrophyRating: 5,
    strengthRating: 3,
    cue: "Hinge back, feel hamstrings load, and keep the spine quiet.",
    substituteOptions: ["Glute bridge", "Single-leg hip hinge", "Hip thrust"]
  },
  {
    name: "Walking lunge",
    muscleGroup: "legs",
    equipment: "dumbbells-only",
    focus: ["lower", "conditioning", "full-body"],
    movementPattern: "lunge",
    stabilityDemand: 4,
    fatigueScore: 3,
    difficulty: 2,
    hypertrophyRating: 4,
    strengthRating: 2,
    cue: "Step long enough to control the knee and push through the whole foot.",
    substituteOptions: ["Reverse lunge", "Step-up", "Split squat hold"]
  },
  {
    name: "Tempo bodyweight squat",
    muscleGroup: "legs",
    equipment: "bodyweight",
    focus: ["lower", "full-body", "conditioning"],
    movementPattern: "squat",
    stabilityDemand: 1,
    fatigueScore: 1,
    difficulty: 1,
    hypertrophyRating: 2,
    strengthRating: 1,
    cue: "Use a three-second lower and stand up with control.",
    substituteOptions: ["Chair squat", "Split squat hold", "Step-up"]
  },
  {
    name: "Reverse lunge",
    muscleGroup: "legs",
    equipment: "bodyweight",
    focus: ["lower", "full-body", "conditioning"],
    movementPattern: "lunge",
    stabilityDemand: 3,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 3,
    strengthRating: 1,
    cue: "Step back softly and drive through the front foot.",
    substituteOptions: ["Split squat hold", "Step-up", "Tempo bodyweight squat"]
  },
  {
    name: "Hip thrust",
    muscleGroup: "glutes",
    equipment: "barbell",
    focus: ["lower", "full-body"],
    movementPattern: "hinge",
    stabilityDemand: 2,
    fatigueScore: 3,
    difficulty: 2,
    hypertrophyRating: 5,
    strengthRating: 4,
    cue: "Lock ribs down and squeeze at the top without overextending.",
    substituteOptions: ["Glute bridge", "Dumbbell Romanian deadlift", "Single-leg hip hinge"]
  },
  {
    name: "Machine chest press",
    muscleGroup: "chest",
    equipment: "machine",
    focus: ["push", "upper", "full-body"],
    movementPattern: "horizontal-push",
    stabilityDemand: 1,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 5,
    strengthRating: 3,
    cue: "Press smoothly and keep shoulder blades anchored.",
    substituteOptions: ["Dumbbell floor press", "Push-up", "Incline push-up"]
  },
  {
    name: "Barbell bench press",
    muscleGroup: "chest",
    equipment: "barbell",
    focus: ["push", "upper", "full-body"],
    movementPattern: "horizontal-push",
    stabilityDemand: 4,
    fatigueScore: 4,
    difficulty: 3,
    hypertrophyRating: 4,
    strengthRating: 5,
    cue: "Stack wrists over elbows, keep shoulder blades set, and stop two reps before form changes.",
    substituteOptions: ["Dumbbell floor press", "Machine chest press", "Push-up"]
  },
  {
    name: "Push-up",
    muscleGroup: "chest",
    equipment: "bodyweight",
    focus: ["push", "upper", "full-body"],
    movementPattern: "horizontal-push",
    stabilityDemand: 3,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 3,
    strengthRating: 2,
    cue: "Keep ribs stacked and stop before the shoulders drift forward.",
    substituteOptions: ["Incline push-up", "Dumbbell floor press", "Machine chest press"]
  },
  {
    name: "Dumbbell floor press",
    muscleGroup: "chest",
    equipment: "dumbbells-only",
    focus: ["push", "upper", "full-body"],
    movementPattern: "horizontal-push",
    stabilityDemand: 2,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 4,
    strengthRating: 3,
    cue: "Pause lightly on the floor and drive with control.",
    substituteOptions: ["Push-up", "Incline push-up", "Machine chest press"]
  },
  {
    name: "One-arm dumbbell row",
    muscleGroup: "back",
    equipment: "dumbbells-only",
    focus: ["pull", "upper", "full-body"],
    movementPattern: "horizontal-pull",
    stabilityDemand: 2,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 5,
    strengthRating: 3,
    cue: "Pull elbow toward the hip and avoid twisting through the torso.",
    substituteOptions: ["Backpack row", "Chest-supported dumbbell row", "Seated cable row"]
  },
  {
    name: "Lat pulldown",
    muscleGroup: "back",
    equipment: "machine",
    focus: ["pull", "upper", "full-body"],
    movementPattern: "vertical-pull",
    stabilityDemand: 1,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 5,
    strengthRating: 3,
    cue: "Drive elbows down and stop before the shoulders roll forward.",
    substituteOptions: ["Band pulldown", "Inverted row", "One-arm dumbbell row"]
  },
  {
    name: "Pull-up",
    muscleGroup: "back",
    equipment: "bodyweight",
    focus: ["pull", "upper", "full-body"],
    movementPattern: "vertical-pull",
    stabilityDemand: 4,
    fatigueScore: 4,
    difficulty: 3,
    hypertrophyRating: 4,
    strengthRating: 5,
    cue: "Start each rep from the back, then drive elbows toward your ribs.",
    substituteOptions: ["Lat pulldown", "Band pulldown", "Inverted row"]
  },
  {
    name: "Seated cable row",
    muscleGroup: "back",
    equipment: "cable",
    focus: ["pull", "upper", "full-body"],
    movementPattern: "horizontal-pull",
    stabilityDemand: 1,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 5,
    strengthRating: 3,
    cue: "Finish with shoulder blades in your back pockets.",
    substituteOptions: ["One-arm dumbbell row", "Backpack row", "Chest-supported dumbbell row"]
  },
  {
    name: "Dumbbell shoulder press",
    muscleGroup: "shoulders",
    equipment: "dumbbells-only",
    focus: ["push", "upper", "full-body"],
    movementPattern: "vertical-push",
    stabilityDemand: 3,
    fatigueScore: 3,
    difficulty: 2,
    hypertrophyRating: 4,
    strengthRating: 4,
    cue: "Press in a slight arc and keep ribs stacked over hips.",
    substituteOptions: ["Pike push-up", "Half-kneeling single-arm press", "Lateral raise"]
  },
  {
    name: "Lateral raise",
    muscleGroup: "shoulders",
    equipment: "dumbbells-only",
    focus: ["push", "upper"],
    movementPattern: "isolation",
    stabilityDemand: 1,
    fatigueScore: 1,
    difficulty: 1,
    hypertrophyRating: 5,
    strengthRating: 1,
    cue: "Lead with elbows and stop around shoulder height.",
    substituteOptions: ["Lean-away wall raise", "Pike push-up", "Band lateral raise"]
  },
  {
    name: "Cable triceps pressdown",
    muscleGroup: "arms",
    equipment: "cable",
    focus: ["push", "upper"],
    movementPattern: "isolation",
    stabilityDemand: 1,
    fatigueScore: 1,
    difficulty: 1,
    hypertrophyRating: 4,
    strengthRating: 1,
    cue: "Pin elbows and finish with a full lockout.",
    substituteOptions: ["Close-grip push-up", "Overhead dumbbell extension", "Diamond incline push-up"]
  },
  {
    name: "Hammer curl",
    muscleGroup: "arms",
    equipment: "dumbbells-only",
    focus: ["pull", "upper"],
    movementPattern: "isolation",
    stabilityDemand: 1,
    fatigueScore: 1,
    difficulty: 1,
    hypertrophyRating: 4,
    strengthRating: 1,
    cue: "Keep wrists neutral and lower slowly.",
    substituteOptions: ["Towel curl isometric", "Band curl", "Chin-up hold"]
  },
  {
    name: "Dead bug",
    muscleGroup: "core",
    equipment: "bodyweight",
    focus: ["core", "full-body"],
    movementPattern: "anti-extension",
    stabilityDemand: 2,
    fatigueScore: 1,
    difficulty: 1,
    hypertrophyRating: 2,
    strengthRating: 2,
    cue: "Exhale, flatten ribs, and move only as far as you can control.",
    substituteOptions: ["Heel taps", "Forearm plank", "Bear plank hold"]
  },
  {
    name: "Side plank",
    muscleGroup: "core",
    equipment: "bodyweight",
    focus: ["core", "full-body"],
    movementPattern: "anti-rotation",
    stabilityDemand: 2,
    fatigueScore: 1,
    difficulty: 1,
    hypertrophyRating: 2,
    strengthRating: 2,
    cue: "Stack hips and make a straight line from head to heels.",
    substituteOptions: ["Knee side plank", "Suitcase carry", "Pallof press"]
  },
  {
    name: "Bear plank shoulder tap",
    muscleGroup: "core",
    equipment: "bodyweight",
    focus: ["core", "full-body", "conditioning"],
    movementPattern: "anti-rotation",
    stabilityDemand: 3,
    fatigueScore: 2,
    difficulty: 2,
    hypertrophyRating: 2,
    strengthRating: 2,
    cue: "Keep hips quiet while tapping slowly from side to side.",
    substituteOptions: ["High plank shoulder tap", "Dead bug", "Forearm plank"]
  },
  {
    name: "Mountain climber intervals",
    muscleGroup: "conditioning",
    equipment: "bodyweight",
    focus: ["conditioning", "full-body"],
    movementPattern: "conditioning",
    stabilityDemand: 2,
    fatigueScore: 3,
    difficulty: 2,
    hypertrophyRating: 1,
    strengthRating: 1,
    cue: "Move fast while keeping shoulders over wrists.",
    substituteOptions: ["Marching high knees", "Step-up intervals", "Incline mountain climber"]
  },
  {
    name: "Kettlebell swing",
    muscleGroup: "conditioning",
    equipment: "kettlebell",
    focus: ["conditioning", "full-body", "lower"],
    movementPattern: "hinge",
    stabilityDemand: 3,
    fatigueScore: 4,
    difficulty: 3,
    hypertrophyRating: 2,
    strengthRating: 3,
    cue: "Snap hips, float the bell, and keep arms relaxed.",
    substituteOptions: ["Dumbbell hinge swing", "Hip hinge drill", "Step-up intervals"]
  },
  {
    name: "Step-up",
    muscleGroup: "legs",
    equipment: "dumbbells-only",
    focus: ["lower", "conditioning", "full-body"],
    movementPattern: "lunge",
    stabilityDemand: 3,
    fatigueScore: 2,
    difficulty: 1,
    hypertrophyRating: 3,
    strengthRating: 2,
    cue: "Own the top position before stepping back down.",
    substituteOptions: ["Alternating reverse lunge", "Tempo bodyweight squat", "Marching high knees"]
  }
];

export function equipmentFits(template: ExerciseTemplate, access: EquipmentAccess) {
  if (template.equipment === "bodyweight") return true;
  if (access === "full-gym") return true;
  if (access === "home-gym") {
    return ["dumbbells-only", "bodyweight", "kettlebell", "barbell"].includes(template.equipment);
  }
  if (access === "dumbbells-only") {
    return ["dumbbells-only", "bodyweight"].includes(template.equipment);
  }
  return false;
}

export function focusForWeakPoint(weakPoint: WeakPoint): BodyFocus {
  if (weakPoint === "legs" || weakPoint === "glutes") return "lower";
  if (weakPoint === "conditioning") return "conditioning";
  if (weakPoint === "core") return "core";
  if (weakPoint === "back" || weakPoint === "arms") return "pull";
  return "push";
}
