import type { BodyFocus, EquipmentAccess, ExercisePrescription, WeakPoint } from "@/lib/types";

export type ExerciseTemplate = Omit<ExercisePrescription, "sets" | "reps" | "rest"> & {
  focus: BodyFocus[];
  difficulty: 1 | 2 | 3;
};

export const exerciseLibrary: ExerciseTemplate[] = [
  {
    name: "Goblet squat",
    muscleGroup: "legs",
    equipment: "dumbbells-only",
    focus: ["lower", "full-body"],
    difficulty: 1,
    cue: "Stay tall, keep the weight close, and leave one rep in reserve.",
    substitution: "Bodyweight tempo squat"
  },
  {
    name: "Dumbbell Romanian deadlift",
    muscleGroup: "glutes",
    equipment: "dumbbells-only",
    focus: ["lower", "full-body"],
    difficulty: 2,
    cue: "Hinge back, feel hamstrings load, and keep the spine quiet.",
    substitution: "Single-leg hip hinge"
  },
  {
    name: "Walking lunge",
    muscleGroup: "legs",
    equipment: "dumbbells-only",
    focus: ["lower", "conditioning"],
    difficulty: 2,
    cue: "Step long enough to control the knee and push through the whole foot.",
    substitution: "Reverse lunge"
  },
  {
    name: "Tempo bodyweight squat",
    muscleGroup: "legs",
    equipment: "bodyweight",
    focus: ["lower", "full-body", "conditioning"],
    difficulty: 1,
    cue: "Use a three-second lower and stand up with control.",
    substitution: "Chair squat"
  },
  {
    name: "Reverse lunge",
    muscleGroup: "legs",
    equipment: "bodyweight",
    focus: ["lower", "full-body", "conditioning"],
    difficulty: 1,
    cue: "Step back softly and drive through the front foot.",
    substitution: "Split squat hold"
  },
  {
    name: "Hip thrust",
    muscleGroup: "glutes",
    equipment: "barbell",
    focus: ["lower", "full-body"],
    difficulty: 2,
    cue: "Lock ribs down and squeeze at the top without overextending.",
    substitution: "Glute bridge"
  },
  {
    name: "Machine chest press",
    muscleGroup: "chest",
    equipment: "machine",
    focus: ["push", "upper", "full-body"],
    difficulty: 1,
    cue: "Press smoothly and keep shoulder blades anchored.",
    substitution: "Push-up"
  },
  {
    name: "Push-up",
    muscleGroup: "chest",
    equipment: "bodyweight",
    focus: ["push", "upper", "full-body"],
    difficulty: 1,
    cue: "Keep ribs stacked and stop before the shoulders drift forward.",
    substitution: "Incline push-up"
  },
  {
    name: "Dumbbell floor press",
    muscleGroup: "chest",
    equipment: "dumbbells-only",
    focus: ["push", "upper", "full-body"],
    difficulty: 1,
    cue: "Pause lightly on the floor and drive with control.",
    substitution: "Incline push-up"
  },
  {
    name: "One-arm dumbbell row",
    muscleGroup: "back",
    equipment: "dumbbells-only",
    focus: ["pull", "upper", "full-body"],
    difficulty: 1,
    cue: "Pull elbow toward the hip and avoid twisting through the torso.",
    substitution: "Backpack row"
  },
  {
    name: "Lat pulldown",
    muscleGroup: "back",
    equipment: "machine",
    focus: ["pull", "upper"],
    difficulty: 1,
    cue: "Drive elbows down and stop before the shoulders roll forward.",
    substitution: "Band pulldown"
  },
  {
    name: "Seated cable row",
    muscleGroup: "back",
    equipment: "cable",
    focus: ["pull", "upper"],
    difficulty: 1,
    cue: "Finish with shoulder blades in your back pockets.",
    substitution: "Chest-supported dumbbell row"
  },
  {
    name: "Dumbbell shoulder press",
    muscleGroup: "shoulders",
    equipment: "dumbbells-only",
    focus: ["push", "upper", "full-body"],
    difficulty: 2,
    cue: "Press in a slight arc and keep ribs stacked over hips.",
    substitution: "Pike push-up"
  },
  {
    name: "Lateral raise",
    muscleGroup: "shoulders",
    equipment: "dumbbells-only",
    focus: ["push", "upper"],
    difficulty: 1,
    cue: "Lead with elbows and stop around shoulder height.",
    substitution: "Lean-away wall raise"
  },
  {
    name: "Cable triceps pressdown",
    muscleGroup: "arms",
    equipment: "cable",
    focus: ["push", "upper"],
    difficulty: 1,
    cue: "Pin elbows and finish with a full lockout.",
    substitution: "Close-grip push-up"
  },
  {
    name: "Hammer curl",
    muscleGroup: "arms",
    equipment: "dumbbells-only",
    focus: ["pull", "upper"],
    difficulty: 1,
    cue: "Keep wrists neutral and lower slowly.",
    substitution: "Towel curl isometric"
  },
  {
    name: "Dead bug",
    muscleGroup: "core",
    equipment: "bodyweight",
    focus: ["core", "full-body"],
    difficulty: 1,
    cue: "Exhale, flatten ribs, and move only as far as you can control.",
    substitution: "Heel taps"
  },
  {
    name: "Side plank",
    muscleGroup: "core",
    equipment: "bodyweight",
    focus: ["core", "full-body"],
    difficulty: 1,
    cue: "Stack hips and make a straight line from head to heels.",
    substitution: "Knee side plank"
  },
  {
    name: "Bear plank shoulder tap",
    muscleGroup: "core",
    equipment: "bodyweight",
    focus: ["core", "full-body", "conditioning"],
    difficulty: 2,
    cue: "Keep hips quiet while tapping slowly from side to side.",
    substitution: "High plank shoulder tap"
  },
  {
    name: "Mountain climber intervals",
    muscleGroup: "conditioning",
    equipment: "bodyweight",
    focus: ["conditioning", "full-body"],
    difficulty: 2,
    cue: "Move fast while keeping shoulders over wrists.",
    substitution: "Marching high knees"
  },
  {
    name: "Kettlebell swing",
    muscleGroup: "conditioning",
    equipment: "kettlebell",
    focus: ["conditioning", "full-body", "lower"],
    difficulty: 3,
    cue: "Snap hips, float the bell, and keep arms relaxed.",
    substitution: "Dumbbell hinge swing"
  },
  {
    name: "Step-up",
    muscleGroup: "legs",
    equipment: "dumbbells-only",
    focus: ["lower", "conditioning", "full-body"],
    difficulty: 1,
    cue: "Own the top position before stepping back down.",
    substitution: "Alternating reverse lunge"
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
