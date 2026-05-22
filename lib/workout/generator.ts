import { clamp } from "@/lib/utils";
import type {
  BodyFocus,
  DailyCheckIn,
  ExercisePrescription,
  GeneratedWorkout
} from "@/lib/types";
import { equipmentFits, exerciseLibrary } from "@/lib/workout/exercises";

const warmupsByIntensity = {
  restore: [
    "3 minutes easy walk or bike",
    "World's greatest stretch x 4 per side",
    "Bodyweight squat x 10",
    "Scap push-up x 8"
  ],
  steady: [
    "4 minutes incline walk or row",
    "Hip hinge drill x 10",
    "Lunge with reach x 6 per side",
    "Light ramp-up set for the first lift"
  ],
  push: [
    "5 minutes easy cardio",
    "Dynamic hips and shoulders x 60 seconds",
    "Explosive bodyweight squats x 8",
    "Two ramp-up sets for the first lift"
  ]
};

function inferFocus(input: DailyCheckIn): BodyFocus {
  if (input.bodyFocus !== "auto") return input.bodyFocus;
  if (input.soreness >= 4) return "upper";
  if (input.energy <= 2 && input.timeAvailable <= 25) return "conditioning";
  if (input.energy >= 4 && input.crowding !== "packed") return "full-body";
  return "upper";
}

function inferIntensity(input: DailyCheckIn): GeneratedWorkout["intensity"] {
  if (input.energy <= 2 || input.soreness >= 4) return "restore";
  if (input.energy >= 4 && input.soreness <= 2) return "push";
  return "steady";
}

function buildPrescription(
  template: (typeof exerciseLibrary)[number],
  input: DailyCheckIn,
  intensity: GeneratedWorkout["intensity"]
): ExercisePrescription {
  const shortSession = input.timeAvailable <= 25;
  const crowded = input.crowding === "packed";
  const baseSets = intensity === "push" ? 4 : intensity === "steady" ? 3 : 2;
  const sets = shortSession ? Math.max(2, baseSets - 1) : baseSets;
  const reps =
    template.muscleGroup === "conditioning"
      ? shortSession
        ? "30 sec on / 30 sec easy"
        : "40 sec on / 20 sec easy"
      : intensity === "push"
        ? "6-10"
        : intensity === "restore"
          ? "8-12 easy"
          : "8-12";
  const rest =
    template.muscleGroup === "conditioning"
      ? "30 sec"
      : shortSession
        ? "45 sec"
        : intensity === "push"
          ? "90 sec"
          : "60 sec";

  return {
    ...template,
    sets,
    reps,
    rest,
    substitution: crowded ? `${template.substitution} if stations are taken` : template.substitution
  };
}

function chooseExercises(input: DailyCheckIn, focus: BodyFocus, intensity: GeneratedWorkout["intensity"]) {
  const targetCount = input.timeAvailable < 20 ? 4 : input.timeAvailable > 45 ? 6 : 5;
  const effectiveEquipment =
    input.crowding === "packed" && input.equipment === "full-gym" ? "dumbbells-only" : input.equipment;
  const possible = exerciseLibrary
    .filter((exercise) => equipmentFits(exercise, effectiveEquipment))
    .filter((exercise) => exercise.focus.includes(focus) || exercise.focus.includes("full-body"))
    .filter((exercise) => (intensity === "restore" ? exercise.difficulty <= 2 : true));

  const fallback = exerciseLibrary
    .filter((exercise) => equipmentFits(exercise, effectiveEquipment))
    .filter((exercise) => (intensity === "restore" ? exercise.difficulty <= 2 : true));

  const pool = possible.length >= targetCount ? possible : fallback;
  const chosen: ExercisePrescription[] = [];
  const seenGroups = new Set<string>();

  for (const exercise of pool) {
    if (chosen.length >= targetCount) break;
    if (seenGroups.has(exercise.muscleGroup) && chosen.length < 3) continue;
    chosen.push(buildPrescription(exercise, input, intensity));
    seenGroups.add(exercise.muscleGroup);
  }

  return chosen.slice(0, targetCount);
}

export function generateWorkout(input: DailyCheckIn): GeneratedWorkout {
  const normalizedInput = {
    ...input,
    timeAvailable: clamp(input.timeAvailable, 10, 90),
    energy: clamp(input.energy, 1, 5),
    soreness: clamp(input.soreness, 1, 5)
  };
  const focus = inferFocus(normalizedInput);
  const intensity = inferIntensity(normalizedInput);
  const exercises = chooseExercises(normalizedInput, focus, intensity);
  const minutes = normalizedInput.timeAvailable;
  const name =
    intensity === "restore"
      ? "Low-Friction Reset"
      : intensity === "push"
        ? "Momentum Builder"
        : "Steady Progress Session";

  const why = [
    `Built for ${minutes} minutes, so the work stays focused without rushing.`,
    normalizedInput.energy <= 2
      ? "Energy is low, so volume is trimmed while keeping the habit alive."
      : normalizedInput.energy >= 4
        ? "Energy is high, so the plan gives you room to push without getting reckless."
        : "Energy is moderate, so the plan balances effort and recovery.",
    normalizedInput.soreness >= 4
      ? "Soreness is high, so the session avoids grinding and favors cleaner reps."
      : "Soreness is manageable, so today can still count as quality training.",
    normalizedInput.crowding === "packed"
      ? "Packed gym? The plan favors portable work and keeps fallbacks ready."
      : "Equipment choices match what you said you can access today."
  ];

  return {
    id: crypto.randomUUID(),
    name,
    duration: minutes,
    focus,
    intensity,
    warmup: warmupsByIntensity[intensity],
    exercises,
    why,
    condensed: [
      "Run the warmup for 3 minutes.",
      `Do the first ${Math.min(3, exercises.length)} exercises as a circuit for 2 rounds.`,
      "Keep every set at a smooth effort and skip anything that causes sharp pain.",
      "Finish with one easy walk, stretch, or breathing minute."
    ]
  };
}
