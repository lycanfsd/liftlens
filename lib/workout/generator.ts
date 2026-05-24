import { clamp, toTitleCase } from "@/lib/utils";
import type {
  BodyFocus,
  DailyCheckIn,
  DiscomfortArea,
  EquipmentAccess,
  ExercisePrescription,
  ExperienceLevel,
  FitnessGoal,
  GeneratedWorkout,
  TrainingGoalMode,
  WeakPoint
} from "@/lib/types";
import { equipmentFits, exerciseLibrary, type ExerciseTemplate } from "@/lib/workout/exercises";

export type PerformanceTrend = "improving" | "steady" | "declining" | "new";

export type WorkoutEngineContext = {
  goal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  weeklyTrainingDays: number;
  weakPoints: WeakPoint[];
  completedThisWeek: number;
  completedLastWeek: number;
  averageEnergy: number | null;
  averageSoreness: number | null;
  performanceTrend: PerformanceTrend;
  weeklyVolumeSets: number;
  recoveryTrend: "fresh" | "stable" | "strained";
};

const defaultContext: WorkoutEngineContext = {
  goal: "recomposition",
  experienceLevel: "intermediate",
  weeklyTrainingDays: 4,
  weakPoints: [],
  completedThisWeek: 0,
  completedLastWeek: 0,
  averageEnergy: null,
  averageSoreness: null,
  performanceTrend: "new",
  weeklyVolumeSets: 0,
  recoveryTrend: "stable"
};

const goalProfiles: Record<
  TrainingGoalMode,
  {
    label: string;
    repRange: string;
    strengthRepRange: string;
    isolationRepRange: string;
    rest: string;
    frequency: string;
    targetRir: number;
    weeklySets: [number, number];
    primaryScore: "hypertrophyRating" | "strengthRating";
    secondaryScore: "hypertrophyRating" | "strengthRating";
    densityBias: number;
  }
> = {
  hypertrophy: {
    label: "Hypertrophy",
    repRange: "8-12",
    strengthRepRange: "6-10",
    isolationRepRange: "12-18",
    rest: "60-90 sec",
    frequency: "Train each priority muscle 2-3x/week.",
    targetRir: 2,
    weeklySets: [10, 18],
    primaryScore: "hypertrophyRating",
    secondaryScore: "strengthRating",
    densityBias: 0.3
  },
  strength: {
    label: "Strength",
    repRange: "4-6",
    strengthRepRange: "3-5",
    isolationRepRange: "8-12",
    rest: "2-3 min",
    frequency: "Practice main patterns 2-4x/week with fatigue controlled.",
    targetRir: 2,
    weeklySets: [6, 12],
    primaryScore: "strengthRating",
    secondaryScore: "hypertrophyRating",
    densityBias: -0.15
  },
  "fat-loss": {
    label: "Fat loss",
    repRange: "10-15",
    strengthRepRange: "8-12",
    isolationRepRange: "12-20",
    rest: "30-60 sec",
    frequency: "Use 3-5 repeatable sessions/week and protect recovery.",
    targetRir: 3,
    weeklySets: [8, 14],
    primaryScore: "hypertrophyRating",
    secondaryScore: "strengthRating",
    densityBias: 0.8
  },
  recomposition: {
    label: "Recomposition",
    repRange: "6-12",
    strengthRepRange: "5-8",
    isolationRepRange: "10-15",
    rest: "60-120 sec",
    frequency: "Touch priority muscles 2x/week while keeping adherence high.",
    targetRir: 2,
    weeklySets: [8, 16],
    primaryScore: "hypertrophyRating",
    secondaryScore: "strengthRating",
    densityBias: 0.45
  },
  "general-fitness": {
    label: "General fitness",
    repRange: "8-12",
    strengthRepRange: "6-10",
    isolationRepRange: "10-15",
    rest: "45-90 sec",
    frequency: "Balance push, pull, legs, core, and conditioning across the week.",
    targetRir: 3,
    weeklySets: [6, 12],
    primaryScore: "hypertrophyRating",
    secondaryScore: "strengthRating",
    densityBias: 0.55
  }
};

const warmupsByIntensity = {
  restore: [
    "3 minutes easy walk or bike",
    "Breathing reset: 4 slow nasal breaths",
    "World's greatest stretch x 4 per side",
    "One light ramp set before the first lift"
  ],
  steady: [
    "4 minutes incline walk or row",
    "Hip hinge drill x 10",
    "Lunge with reach x 6 per side",
    "Two ramp sets for the first main movement"
  ],
  push: [
    "5 minutes easy cardio",
    "Dynamic hips and shoulders x 60 seconds",
    "Explosive bodyweight squats or push-ups x 6-8",
    "Two to three ramp sets before the first lift"
  ]
};

function goalModeFromFitnessGoal(goal: FitnessGoal): TrainingGoalMode {
  if (goal === "build-muscle") return "hypertrophy";
  if (goal === "strength") return "strength";
  if (goal === "lose-fat") return "fat-loss";
  if (goal === "general-health") return "general-fitness";
  return "recomposition";
}

function normalizeInput(input: DailyCheckIn): DailyCheckIn {
  return {
    ...input,
    timeAvailable: clamp(input.timeAvailable, 10, 90),
    energy: clamp(input.energy, 1, 5),
    soreness: clamp(input.soreness, 1, 5),
    sleepQuality: clamp(input.sleepQuality ?? 3, 1, 5),
    missedWorkouts: input.missedWorkouts ?? "none",
    discomfortArea: input.discomfortArea ?? "none"
  };
}

function readinessScore(input: DailyCheckIn, context: WorkoutEngineContext) {
  const sorenessScore = (6 - input.soreness) / 5;
  const energyScore = input.energy / 5;
  const sleepScore = input.sleepQuality / 5;
  const timeScore = Math.min(input.timeAvailable, 45) / 45;
  const crowdingPenalty = input.crowding === "packed" ? 8 : input.crowding === "moderate" ? 3 : 0;
  const missedPenalty = input.missedWorkouts === "1-week-plus" ? 10 : input.missedWorkouts === "2-3-days" ? 5 : 0;
  const trendPenalty = context.performanceTrend === "declining" ? 7 : context.recoveryTrend === "strained" ? 5 : 0;

  return Math.round(
    clamp((energyScore * 0.32 + sorenessScore * 0.28 + sleepScore * 0.22 + timeScore * 0.18) * 100 - crowdingPenalty - missedPenalty - trendPenalty, 28, 96)
  );
}

function recoveryScore(input: DailyCheckIn, context: WorkoutEngineContext) {
  const base = (6 - input.soreness) * 13 + input.energy * 8 + input.sleepQuality * 9;
  const trendAdjustment =
    context.recoveryTrend === "fresh" ? 8 : context.recoveryTrend === "strained" ? -10 : 0;
  const performanceAdjustment = context.performanceTrend === "declining" ? -8 : context.performanceTrend === "improving" ? 5 : 0;
  return Math.round(clamp(base + trendAdjustment + performanceAdjustment, 20, 98));
}

function shouldDeload(input: DailyCheckIn, context: WorkoutEngineContext, recovery: number) {
  if (input.missedWorkouts === "1-week-plus") {
    return {
      active: true,
      reason: "A week away from training is a re-entry signal, not a reason for punishment volume.",
      adjustment: "Use about 60-70% of normal volume and keep 3-4 reps in reserve."
    };
  }

  if (recovery < 45 || (input.soreness >= 4 && input.sleepQuality <= 2)) {
    return {
      active: true,
      reason: "Recovery markers are strained today.",
      adjustment: "Trim one set from most lifts, avoid grinding, and keep the session technical."
    };
  }

  if (context.performanceTrend === "declining" && context.recoveryTrend === "strained") {
    return {
      active: true,
      reason: "Recent performance and recovery are both trending down.",
      adjustment: "Use a low-fatigue day and rebuild momentum before adding load."
    };
  }

  return {
    active: false,
    reason: "No deload trigger detected.",
    adjustment: "Use the planned effort targets and stop when rep quality drops."
  };
}

function inferIntensity(input: DailyCheckIn, readiness: number, deloadActive: boolean): GeneratedWorkout["intensity"] {
  if (deloadActive || readiness < 50 || input.energy <= 2 || input.soreness >= 4) return "restore";
  if (readiness >= 78 && input.energy >= 4 && input.soreness <= 2 && input.sleepQuality >= 3) return "push";
  return "steady";
}

function inferFocus(input: DailyCheckIn, context: WorkoutEngineContext): BodyFocus {
  if (input.bodyFocus !== "auto") return input.bodyFocus;
  if (input.discomfortArea === "legs" || input.discomfortArea === "glutes") return "upper";
  if (input.soreness >= 4 && context.weakPoints.includes("back")) return "pull";
  if (input.soreness >= 4) return "upper";
  if (input.energy <= 2 && input.timeAvailable <= 25) return "conditioning";
  if (context.weakPoints.includes("legs") || context.weakPoints.includes("glutes")) return "lower";
  if (context.weakPoints.includes("back")) return "pull";
  if (context.weakPoints.includes("chest") || context.weakPoints.includes("shoulders")) return "push";
  return "full-body";
}

function targetPatterns(focus: BodyFocus, mode: TrainingGoalMode) {
  if (focus === "lower") return ["squat", "hinge", "lunge", "anti-extension", "conditioning"];
  if (focus === "upper") return ["horizontal-push", "horizontal-pull", "vertical-push", "vertical-pull", "isolation"];
  if (focus === "push") return ["horizontal-push", "vertical-push", "isolation", "anti-extension"];
  if (focus === "pull") return ["horizontal-pull", "vertical-pull", "hinge", "isolation", "anti-rotation"];
  if (focus === "core") return ["anti-extension", "anti-rotation", "locomotion", "conditioning"];
  if (focus === "conditioning") return ["conditioning", "locomotion", "lunge", "anti-extension"];
  if (mode === "strength") return ["squat", "hinge", "horizontal-push", "horizontal-pull", "anti-extension"];
  return ["squat", "hinge", "horizontal-push", "horizontal-pull", "vertical-push", "vertical-pull", "anti-extension"];
}

function discomfortPenalty(template: ExerciseTemplate, discomfortArea: DiscomfortArea) {
  if (discomfortArea === "none") return 0;
  if (template.muscleGroup === discomfortArea) return 8;
  if ((discomfortArea === "legs" || discomfortArea === "glutes") && ["squat", "hinge", "lunge"].includes(template.movementPattern)) return 5;
  if (discomfortArea === "shoulders" && ["horizontal-push", "vertical-push", "vertical-pull"].includes(template.movementPattern)) return 5;
  if (discomfortArea === "back" && ["hinge", "horizontal-pull", "vertical-pull"].includes(template.movementPattern)) return 5;
  return 0;
}

function equipmentPenalty(template: ExerciseTemplate, input: DailyCheckIn) {
  if (!equipmentFits(template, input.equipment)) return 100;
  if (input.crowding === "packed" && ["machine", "cable", "barbell"].includes(template.equipment)) return 12;
  if (input.crowding === "moderate" && ["machine", "cable"].includes(template.equipment)) return 3;
  return 0;
}

function scoreExercise(
  template: ExerciseTemplate,
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  mode: TrainingGoalMode,
  focus: BodyFocus,
  intensity: GeneratedWorkout["intensity"]
) {
  const profile = goalProfiles[mode];
  const goalScore = template[profile.primaryScore] * 4 + template[profile.secondaryScore] * 1.5;
  const focusScore =
    template.focus.includes(focus) || template.focus.includes("full-body")
      ? 10
      : focus === "conditioning" && template.muscleGroup === "conditioning"
        ? 8
        : 0;
  const weakPointScore = context.weakPoints.includes(template.muscleGroup as WeakPoint) ? 4 : 0;
  const fatiguePenalty = template.fatigueScore * (intensity === "restore" ? 2.2 : intensity === "push" ? 0.8 : 1.2);
  const stabilityPenalty = input.energy <= 2 ? template.stabilityDemand * 1.4 : 0;
  const densityBonus = profile.densityBias * (6 - template.fatigueScore);
  const stimulusToFatigue = template[profile.primaryScore] / template.fatigueScore;

  return (
    goalScore +
    focusScore +
    weakPointScore +
    densityBonus +
    stimulusToFatigue * 2 -
    fatiguePenalty -
    stabilityPenalty -
    equipmentPenalty(template, input) -
    discomfortPenalty(template, input.discomfortArea)
  );
}

function availableSubstitution(template: ExerciseTemplate, equipment: EquipmentAccess) {
  const availableNames = new Set(
    exerciseLibrary.filter((exercise) => equipmentFits(exercise, equipment)).map((exercise) => exercise.name)
  );
  return template.substituteOptions.find((name) => availableNames.has(name)) ?? template.substituteOptions[0] ?? "Lower-fatigue variation";
}

function setTargetCount(input: DailyCheckIn, intensity: GeneratedWorkout["intensity"], deloadActive: boolean) {
  const base = input.timeAvailable < 20 ? 4 : input.timeAvailable > 50 ? 6 : 5;
  if (deloadActive || intensity === "restore") return Math.max(3, base - 1);
  return base;
}

function setsForExercise(
  template: ExerciseTemplate,
  index: number,
  input: DailyCheckIn,
  mode: TrainingGoalMode,
  intensity: GeneratedWorkout["intensity"],
  deloadActive: boolean
) {
  const isPrimary = index < 2 && template.movementPattern !== "isolation" && template.muscleGroup !== "conditioning";
  const shortSession = input.timeAvailable <= 25;
  const base =
    mode === "strength" && isPrimary
      ? 4
      : mode === "fat-loss"
        ? 3
        : isPrimary
          ? 3
          : 2;
  const pushBonus = intensity === "push" && isPrimary ? 1 : 0;
  const trim = (shortSession ? 1 : 0) + (deloadActive ? 1 : 0) + (input.energy <= 2 ? 1 : 0);

  return clamp(base + pushBonus - trim, 1, intensity === "push" ? 5 : 4);
}

function repsForExercise(template: ExerciseTemplate, mode: TrainingGoalMode) {
  const profile = goalProfiles[mode];
  if (template.muscleGroup === "conditioning") return "30-45 sec";
  if (template.movementPattern === "isolation") return profile.isolationRepRange;
  if (mode === "strength" && template.strengthRating >= 4) return profile.strengthRepRange;
  return profile.repRange;
}

function restForExercise(template: ExerciseTemplate, mode: TrainingGoalMode, input: DailyCheckIn) {
  if (input.timeAvailable <= 20) return "30-45 sec";
  if (template.muscleGroup === "conditioning") return "30 sec";
  if (mode === "strength" && template.strengthRating >= 4) return "2-3 min";
  return goalProfiles[mode].rest;
}

function buildPrescription(
  template: ExerciseTemplate,
  index: number,
  input: DailyCheckIn,
  mode: TrainingGoalMode,
  intensity: GeneratedWorkout["intensity"],
  deloadActive: boolean
): ExercisePrescription {
  const profile = goalProfiles[mode];
  const targetRir = clamp(
    profile.targetRir + (intensity === "restore" ? 1 : intensity === "push" ? -1 : 0) + (deloadActive ? 1 : 0),
    1,
    5
  );
  const targetRpe = 10 - targetRir;
  const substitution = availableSubstitution(template, input.crowding === "packed" ? "dumbbells-only" : input.equipment);
  const stimulusToFatigue = Number((template[profile.primaryScore] / template.fatigueScore).toFixed(1));

  const adaptation =
    input.crowding === "packed" && ["machine", "cable", "barbell"].includes(template.equipment)
      ? "Selected only if open; otherwise use the substitution to avoid waiting."
      : input.discomfortArea !== "none" && discomfortPenalty(template, input.discomfortArea) > 0
        ? "Keep this pain-free. Swap immediately if discomfort changes your form."
        : intensity === "restore"
          ? "Low-fatigue version: stop every set while reps still look identical."
          : "Progression version: add reps first, load second.";

  return {
    name: template.name,
    muscleGroup: template.muscleGroup,
    equipment: template.equipment,
    movementPattern: template.movementPattern,
    fatigueScore: template.fatigueScore,
    stimulusToFatigue,
    targetRir,
    targetRpe,
    tempo: mode === "strength" ? "Controlled eccentric, powerful concentric" : "2 sec down / controlled up",
    sets: setsForExercise(template, index, input, mode, intensity, deloadActive),
    reps: repsForExercise(template, mode),
    rest: restForExercise(template, mode, input),
    cue: template.cue,
    substitution:
      input.crowding === "packed"
        ? `${substitution} if the station is taken.`
        : input.discomfortArea !== "none"
          ? `${substitution} if you feel discomfort or form compensation.`
          : substitution,
    progressionRule:
      mode === "strength"
        ? "When all sets hit the top rep target at the prescribed RIR, add 2.5-5 lb next time."
        : "When all sets hit the top of the rep range at target RIR, add load or one rep next time.",
    adaptation
  };
}

function chooseExercises(
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  mode: TrainingGoalMode,
  focus: BodyFocus,
  intensity: GeneratedWorkout["intensity"],
  deloadActive: boolean
) {
  const patterns = targetPatterns(focus, mode);
  const targetCount = setTargetCount(input, intensity, deloadActive);
  const sorted = [...exerciseLibrary]
    .filter((exercise) => equipmentPenalty(exercise, input) < 100)
    .sort(
      (a, b) =>
        scoreExercise(b, input, context, mode, focus, intensity) -
        scoreExercise(a, input, context, mode, focus, intensity)
    );
  const chosen: ExerciseTemplate[] = [];

  for (const pattern of patterns) {
    if (chosen.length >= targetCount) break;
    const match = sorted.find(
      (exercise) =>
        exercise.movementPattern === pattern &&
        !chosen.includes(exercise) &&
        (chosen.length >= 2 || discomfortPenalty(exercise, input.discomfortArea) < 8)
    );
    if (match) chosen.push(match);
  }

  for (const exercise of sorted) {
    if (chosen.length >= targetCount) break;
    if (chosen.includes(exercise)) continue;
    const duplicatePattern = chosen.some((item) => item.movementPattern === exercise.movementPattern);
    if (duplicatePattern && chosen.length < 4) continue;
    chosen.push(exercise);
  }

  return chosen.slice(0, targetCount).map((exercise, index) =>
    buildPrescription(exercise, index, input, mode, intensity, deloadActive)
  );
}

function weeklyVolumeTarget(mode: TrainingGoalMode, context: WorkoutEngineContext) {
  const [minSets, maxSets] = goalProfiles[mode].weeklySets;
  const experienceBump = context.experienceLevel === "advanced" ? 2 : context.experienceLevel === "beginner" ? -2 : 0;
  const low = Math.max(4, minSets + experienceBump);
  const high = Math.max(low + 2, maxSets + experienceBump);
  return `${low}-${high} hard sets / priority muscle / week`;
}

function volumeStatus(mode: TrainingGoalMode, context: WorkoutEngineContext) {
  const [minSets, maxSets] = goalProfiles[mode].weeklySets;
  if (context.weeklyVolumeSets <= 0) return "No weekly set data yet; today starts the signal.";
  if (context.weeklyVolumeSets < minSets) return `${context.weeklyVolumeSets} sets logged this week, below the usual minimum effective range.`;
  if (context.weeklyVolumeSets > maxSets) return `${context.weeklyVolumeSets} sets logged this week, above the usual recoverable range.`;
  return `${context.weeklyVolumeSets} sets logged this week, inside the productive range.`;
}

function adherenceStatus(context: WorkoutEngineContext) {
  const target = Math.max(1, context.weeklyTrainingDays);
  const percent = Math.round(clamp((context.completedThisWeek / target) * 100, 0, 140));
  return `${percent}% of weekly target completed (${context.completedThisWeek}/${target} sessions).`;
}

function workoutName(mode: TrainingGoalMode, intensity: GeneratedWorkout["intensity"], deloadActive: boolean) {
  if (deloadActive) return "Science-Based Rebuild Day";
  if (intensity === "restore") return "Low-Fatigue Adaptive Session";
  if (mode === "strength" && intensity === "push") return "Strength Practice Push";
  if (mode === "hypertrophy") return "Hypertrophy Volume Builder";
  if (mode === "fat-loss") return "Lean Conditioning Lift";
  if (mode === "general-fitness") return "Balanced Fitness Session";
  return intensity === "push" ? "Recomposition Push Day" : "Recomposition Base Day";
}

function adaptationNotes(input: DailyCheckIn, context: WorkoutEngineContext, deload: GeneratedWorkout["deload"]) {
  return [
    input.sleepQuality <= 2
      ? "Sleep is low, so the engine protects skill quality and trims high-fatigue work."
      : "Sleep is adequate enough to train, with RIR guardrails still active.",
    input.missedWorkouts === "none"
      ? "No missed-day penalty today; progression can follow the normal rule."
      : "Missed workouts trigger a re-entry dose: no revenge volume, just resume the pattern.",
    context.performanceTrend === "declining"
      ? "Recent performance trend is down, so load jumps are paused until reps rebound."
      : "Progression stays available when sets land at the prescribed RIR.",
    deload?.active
      ? deload.adjustment
      : "No deload is required today; use the target RPE instead of chasing failure."
  ];
}

export function generateWorkout(input: DailyCheckIn, partialContext: Partial<WorkoutEngineContext> = {}): GeneratedWorkout {
  const context = { ...defaultContext, ...partialContext };
  const normalizedInput = normalizeInput(input);
  const mode = goalModeFromFitnessGoal(context.goal);
  const recovery = recoveryScore(normalizedInput, context);
  const readiness = readinessScore(normalizedInput, context);
  const deload = shouldDeload(normalizedInput, context, recovery);
  const intensity = inferIntensity(normalizedInput, readiness, deload.active);
  const focus = inferFocus(normalizedInput, context);
  const exercises = chooseExercises(normalizedInput, context, mode, focus, intensity, deload.active);
  const targetRir = goalProfiles[mode].targetRir + (intensity === "restore" ? 1 : intensity === "push" ? -1 : 0);
  const profile = goalProfiles[mode];

  const why = [
    `${profile.label} logic selected ${profile.repRange} work, ${profile.frequency.toLowerCase()}`,
    `Recovery score is ${recovery}/100 and readiness is ${readiness}/100, so today is a ${intensity} dose.`,
    normalizedInput.crowding === "packed"
      ? "Packed gym logic lowers station dependence and raises the value of portable substitutions."
      : "Equipment choices match today's access while preserving movement pattern balance.",
    normalizedInput.discomfortArea !== "none"
      ? `Discomfort safeguard is active for ${toTitleCase(normalizedInput.discomfortArea)}; swap any movement that changes your form.`
      : "No discomfort area was flagged, so the engine keeps normal exercise options available."
  ];

  return {
    id: crypto.randomUUID(),
    name: workoutName(mode, intensity, deload.active),
    duration: normalizedInput.timeAvailable,
    focus,
    trainingGoal: mode,
    intensity,
    readinessScore: readiness,
    recoveryScore: recovery,
    targetRir: clamp(targetRir, 1, 5),
    targetRpe: 10 - clamp(targetRir, 1, 5),
    weeklyVolumeTarget: weeklyVolumeTarget(mode, context),
    deload,
    progression: {
      estimatedOneRepMax:
        mode === "strength"
          ? "Use Epley estimate once load is logged: weight x (1 + reps / 30)."
          : "Optional for this goal; track top-set load/reps on main lifts.",
      performanceTrend: `Recent performance trend: ${context.performanceTrend}.`,
      adherence: adherenceStatus(context),
      weeklyVolume: volumeStatus(mode, context),
      recoveryTrend: `Recovery trend: ${context.recoveryTrend}.`
    },
    adaptationNotes: adaptationNotes(normalizedInput, context, deload),
    warmup: warmupsByIntensity[intensity],
    exercises,
    why,
    condensed: [
      "Run the warmup for 3 minutes.",
      `Do the first ${Math.min(3, exercises.length)} exercises as a circuit for 2 rounds.`,
      `Keep every set around RPE ${10 - clamp(targetRir, 1, 5)} and stop if reps get sloppy.`,
      "Finish with one easy walk, stretch, or breathing minute."
    ]
  };
}
