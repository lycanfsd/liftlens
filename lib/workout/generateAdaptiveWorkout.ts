import { clamp, createId, toTitleCase } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import type { MomentumState } from "@/lib/momentum";
import type {
  BodyFocus,
  DailyCheckIn,
  DiscomfortArea,
  EquipmentAccess,
  ExercisePrescription,
  FitnessGoal,
  GeneratedWorkout,
  InputImpact,
  MuscleSoreness,
  PreferredSplit,
  ProgramPhase,
  ReadinessLabel,
  StrategyType,
  TrainingDose,
  TrainingGoalMode,
  WeakPoint
} from "@/lib/types";
import { equipmentFits, exerciseLibrary, focusForWeakPoint, type ExerciseTemplate } from "@/lib/workout/exercises";

export type PerformanceTrend = "improving" | "steady" | "declining" | "new";

export type RecoveryTrend = "fresh" | "stable" | "strained";

export type WorkoutEngineContext = {
  goal: FitnessGoal;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  preferredSplit: PreferredSplit;
  weeklyTrainingDays: number;
  preferredWorkoutLength: number | null;
  equipmentAccess: EquipmentAccess;
  weakPoints: WeakPoint[];
  injuryNotes: string | null;
  dislikedExercises: string[];
  completedThisWeek: number;
  completedLastWeek: number;
  averageEnergy: number | null;
  averageSoreness: number | null;
  performanceTrend: PerformanceTrend;
  weeklyVolumeSets: number;
  recoveryTrend: RecoveryTrend;
  recentAdherence: number;
  currentProgramPhase: ProgramPhase;
  momentumScore: number;
  momentumState: MomentumState;
  momentumProtectionMode: boolean;
  momentumRecoveryMode: boolean;
};

type ReadinessResult = {
  score: number;
  label: ReadinessLabel;
  increasing: string[];
  decreasing: string[];
  calculation: string[];
  recommendedStrategy: string;
};

type DoseDecision = {
  strategy: StrategyType;
  trainingDose: TrainingDose;
  volumeMultiplier: number;
  exerciseCount: number;
  targetRir: number;
  targetRpe: number;
  progressionAggressiveness: "paused" | "conservative" | "normal" | "aggressive";
  complexity: "low" | "moderate" | "high";
  supersetsEnabled: boolean;
  doseReason: string;
};

type ExerciseSelectionDebug = {
  substitutions: string[];
  avoided: string[];
};

const muscleGroups: WeakPoint[] = ["chest", "shoulders", "arms", "back", "legs", "quads", "hamstrings", "glutes", "calves", "core", "conditioning"];

const defaultSoreness: Record<WeakPoint, number> = {
  chest: 2,
  shoulders: 2,
  arms: 2,
  back: 2,
  legs: 2,
  quads: 2,
  hamstrings: 2,
  glutes: 2,
  calves: 2,
  core: 2,
  conditioning: 2
};

const defaultContext: WorkoutEngineContext = {
  goal: "recomposition",
  experienceLevel: "intermediate",
  preferredSplit: "auto",
  weeklyTrainingDays: 4,
  preferredWorkoutLength: null,
  equipmentAccess: "full-gym",
  weakPoints: [],
  injuryNotes: null,
  dislikedExercises: [],
  completedThisWeek: 0,
  completedLastWeek: 0,
  averageEnergy: null,
  averageSoreness: null,
  performanceTrend: "new",
  weeklyVolumeSets: 0,
  recoveryTrend: "stable",
  recentAdherence: 0,
  currentProgramPhase: "build",
  momentumScore: 68,
  momentumState: "Stable",
  momentumProtectionMode: false,
  momentumRecoveryMode: false
};

const goalProfiles: Record<
  TrainingGoalMode,
  {
    label: string;
    repRange: string;
    strengthRepRange: string;
    isolationRepRange: string;
    rest: string;
    targetRir: number;
    weeklySets: [number, number];
    primaryScore: "hypertrophyRating" | "strengthRating" | "athleticRating";
    secondaryScore: "hypertrophyRating" | "strengthRating" | "athleticRating";
    priorityPatterns: string[];
  }
> = {
  hypertrophy: {
    label: "Muscle gain",
    repRange: "8-12",
    strengthRepRange: "6-10",
    isolationRepRange: "12-18",
    rest: "60-90 sec",
    targetRir: 2,
    weeklySets: [10, 18],
    primaryScore: "hypertrophyRating",
    secondaryScore: "strengthRating",
    priorityPatterns: ["horizontal-push", "horizontal-pull", "squat", "hinge", "isolation"]
  },
  strength: {
    label: "Strength",
    repRange: "4-6",
    strengthRepRange: "3-5",
    isolationRepRange: "8-12",
    rest: "2-3 min",
    targetRir: 2,
    weeklySets: [6, 12],
    primaryScore: "strengthRating",
    secondaryScore: "hypertrophyRating",
    priorityPatterns: ["squat", "hinge", "horizontal-push", "horizontal-pull", "anti-extension"]
  },
  "fat-loss": {
    label: "Fat loss",
    repRange: "10-15",
    strengthRepRange: "8-12",
    isolationRepRange: "12-20",
    rest: "30-60 sec",
    targetRir: 3,
    weeklySets: [8, 14],
    primaryScore: "hypertrophyRating",
    secondaryScore: "athleticRating",
    priorityPatterns: ["squat", "horizontal-pull", "horizontal-push", "conditioning", "anti-extension"]
  },
  recomposition: {
    label: "Recomposition",
    repRange: "6-12",
    strengthRepRange: "5-8",
    isolationRepRange: "10-15",
    rest: "60-120 sec",
    targetRir: 2,
    weeklySets: [8, 16],
    primaryScore: "hypertrophyRating",
    secondaryScore: "strengthRating",
    priorityPatterns: ["squat", "hinge", "horizontal-push", "horizontal-pull", "vertical-pull"]
  },
  "general-fitness": {
    label: "General fitness",
    repRange: "8-12",
    strengthRepRange: "6-10",
    isolationRepRange: "10-15",
    rest: "45-90 sec",
    targetRir: 3,
    weeklySets: [6, 12],
    primaryScore: "athleticRating",
    secondaryScore: "hypertrophyRating",
    priorityPatterns: ["squat", "horizontal-pull", "horizontal-push", "anti-extension", "conditioning"]
  },
  "athletic-performance": {
    label: "Athletic performance",
    repRange: "5-8",
    strengthRepRange: "3-6",
    isolationRepRange: "8-12",
    rest: "75-150 sec",
    targetRir: 2,
    weeklySets: [6, 14],
    primaryScore: "athleticRating",
    secondaryScore: "strengthRating",
    priorityPatterns: ["power", "squat", "hinge", "lunge", "carry", "anti-rotation"]
  }
};

const warmupsByDose: Record<TrainingDose, string[]> = {
  low: [
    "3 minutes easy walk or bike",
    "Breathing reset: 4 slow nasal breaths",
    "Gentle mobility for the first two target joints",
    "One light ramp set before the first lift"
  ],
  moderate: [
    "4 minutes incline walk, bike, or row",
    "Hip hinge drill x 10",
    "Scap push-up or band pull-apart x 10",
    "Two ramp sets for the first main movement"
  ],
  high: [
    "5 minutes easy cardio",
    "Dynamic hips and shoulders x 60 seconds",
    "Explosive low-risk primer x 5 reps",
    "Two to three ramp sets before the first lift"
  ],
  deload: [
    "5 minutes easy Zone 2 movement",
    "Joint circles and long exhales x 90 seconds",
    "Two very light technique sets",
    "Start the first work set only if movement feels better after warmup"
  ]
};

function goalModeFromFitnessGoal(goal: FitnessGoal): TrainingGoalMode {
  if (goal === "build-muscle") return "hypertrophy";
  if (goal === "strength") return "strength";
  if (goal === "lose-fat") return "fat-loss";
  if (goal === "general-health") return "general-fitness";
  if (goal === "athletic-performance") return "athletic-performance";
  return "recomposition";
}

function normalizeSoreness(soreness: MuscleSoreness | undefined, fallback: number) {
  return muscleGroups.reduce<Record<WeakPoint, number>>((acc, group) => {
    acc[group] = clamp(Number(soreness?.[group] ?? fallback), 1, 5);
    return acc;
  }, { ...defaultSoreness });
}

function normalizeInput(input: DailyCheckIn): DailyCheckIn {
  const soreness = clamp(Number(input.soreness ?? 2), 1, 5);

  return {
    ...input,
    timeAvailable: clamp(Number(input.timeAvailable ?? 35), 10, 120),
    energy: clamp(Number(input.energy ?? 3), 1, 5),
    soreness,
    sleepQuality: clamp(Number(input.sleepQuality ?? 3), 1, 5),
    stressLevel: clamp(Number(input.stressLevel ?? 3), 1, 5),
    equipment: input.equipment ?? "full-gym",
    crowding: input.crowding ?? "moderate",
    bodyFocus: input.bodyFocus ?? "auto",
    missedWorkouts: input.missedWorkouts ?? "none",
    discomfortArea: input.discomfortArea ?? "none",
    sorenessByMuscle: normalizeSoreness(input.sorenessByMuscle, soreness),
    injuryAreas: Array.from(new Set([...(input.injuryAreas ?? []), input.discomfortArea].filter((area) => area !== "none"))) as DiscomfortArea[],
    preferredSplit: input.preferredSplit ?? "auto",
    currentProgramPhase: input.currentProgramPhase ?? "build",
    dislikedExercises: input.dislikedExercises ?? []
  };
}

function normalizeContext(partialContext: Partial<WorkoutEngineContext> = {}): WorkoutEngineContext {
  const context = { ...defaultContext, ...partialContext };
  return {
    ...context,
    weeklyTrainingDays: clamp(context.weeklyTrainingDays, 1, 7),
    weakPoints: context.weakPoints ?? [],
    dislikedExercises: context.dislikedExercises ?? [],
    momentumScore: clamp(context.momentumScore ?? 68, 0, 100),
    momentumProtectionMode: Boolean(context.momentumProtectionMode),
    momentumRecoveryMode: Boolean(context.momentumRecoveryMode),
    recentAdherence:
      context.recentAdherence > 0
        ? clamp(context.recentAdherence, 0, 1.4)
        : clamp(context.completedThisWeek / Math.max(1, context.weeklyTrainingDays), 0, 1.4)
  };
}

function averageSoreness(soreness: Record<WeakPoint, number>) {
  return muscleGroups.reduce((sum, group) => sum + soreness[group], 0) / muscleGroups.length;
}

function maxSorenessGroups(soreness: Record<WeakPoint, number>) {
  return muscleGroups.filter((group) => soreness[group] >= 4);
}

function readinessLabel(score: number): ReadinessLabel {
  if (score >= 74) return "high";
  if (score >= 52) return "moderate";
  return "low";
}

function trendScore(context: WorkoutEngineContext) {
  if (context.performanceTrend === "improving") return 1;
  if (context.performanceTrend === "steady" || context.performanceTrend === "new") return 0.72;
  return 0.35;
}

function recoveryTrendScore(context: WorkoutEngineContext) {
  if (context.recoveryTrend === "fresh") return 1;
  if (context.recoveryTrend === "stable") return 0.72;
  return 0.35;
}

function calculateReadiness(input: DailyCheckIn, context: WorkoutEngineContext): ReadinessResult {
  const sorenessAverage = averageSoreness(input.sorenessByMuscle as Record<WeakPoint, number>);
  const sorenessScore = (6 - sorenessAverage) / 5;
  const energyScore = input.energy / 5;
  const sleepScore = input.sleepQuality / 5;
  const stressScore = (6 - input.stressLevel) / 5;
  const adherenceScore = clamp(context.recentAdherence, 0, 1);
  const performanceScore = trendScore(context);
  const recoveryScore = recoveryTrendScore(context);
  const momentumScore = clamp(context.momentumScore, 0, 100) / 100;
  const missedPenalty =
    input.missedWorkouts === "1-week-plus" ? 10 : input.missedWorkouts === "2-3-days" ? 6 : input.missedWorkouts === "1-day" ? 2 : 0;
  const injuryPenalty = input.injuryAreas.length > 0 ? 6 : 0;
  const phasePenalty = input.currentProgramPhase === "deload" ? 12 : input.currentProgramPhase === "return" ? 6 : 0;

  const raw =
    energyScore * 23 +
    sleepScore * 20 +
    stressScore * 15 +
    sorenessScore * 17 +
    performanceScore * 10 +
    adherenceScore * 8 +
    recoveryScore * 7 +
    momentumScore * 5 -
    missedPenalty -
    injuryPenalty -
    phasePenalty -
    (context.momentumProtectionMode ? 4 : 0);

  const score = Math.round(clamp(raw, 18, 96));
  const increasing: string[] = [];
  const decreasing: string[] = [];

  if (input.energy >= 4) increasing.push("High energy supports harder compounds.");
  if (input.sleepQuality >= 4) increasing.push("Good sleep allows normal or increased intensity.");
  if (input.stressLevel <= 2) increasing.push("Low stress keeps exercise complexity available.");
  if (context.performanceTrend === "improving") increasing.push("Recent performance trend supports progression.");
  if (context.momentumState === "High Momentum") increasing.push("Momentum supports normal progression.");
  if (input.energy <= 2) decreasing.push("Low energy lowers volume and removes PR attempts.");
  if (input.sleepQuality <= 2) decreasing.push("Poor sleep increases RIR and lowers intensity.");
  if (input.stressLevel >= 4) decreasing.push("High stress reduces complexity and total work.");
  if (sorenessAverage >= 3.4) decreasing.push("Soreness is elevated, so direct volume is capped.");
  if (context.performanceTrend === "declining") decreasing.push("Declining performance pauses aggressive overload.");
  if (input.injuryAreas.length > 0) decreasing.push("Injury limitations remove high-risk movements.");
  if (context.momentumProtectionMode) decreasing.push("Momentum Protection Mode trims friction and setup complexity.");

  return {
    score,
    label: readinessLabel(score),
    increasing,
    decreasing,
    calculation: [
      `Energy ${input.energy}/5 contributed ${Math.round(energyScore * 23)} readiness points.`,
      `Sleep ${input.sleepQuality}/5 contributed ${Math.round(sleepScore * 20)} readiness points.`,
      `Stress ${input.stressLevel}/5 adjusted readiness by ${Math.round(stressScore * 15)} points.`,
      `Average soreness ${sorenessAverage.toFixed(1)}/5 contributed ${Math.round(sorenessScore * 17)} points.`,
      `Performance trend ${context.performanceTrend} contributed ${Math.round(performanceScore * 10)} points.`,
      `Adherence ${(context.recentAdherence * 100).toFixed(0)}% contributed ${Math.round(adherenceScore * 8)} points.`,
      `Momentum ${context.momentumScore}/100 adjusted readiness by ${Math.round(momentumScore * 5) - (context.momentumProtectionMode ? 4 : 0)} points.`,
      `Penalties: missed ${missedPenalty}, injuries ${injuryPenalty}, phase ${phasePenalty}.`
    ],
    recommendedStrategy:
      score < 52
        ? "Reduce volume, keep 2-4 reps in reserve, and prioritize consistency."
        : score >= 74
          ? "Use a productive push while keeping fatigue guardrails."
          : "Train normally with adaptive substitutions and no forced PR work."
  };
}

function decideDose(input: DailyCheckIn, context: WorkoutEngineContext, readiness: ReadinessResult): DoseDecision {
  const profile = goalProfiles[goalModeFromFitnessGoal(context.goal)];
  const shortSession = input.timeAvailable < 30;
  const compressedSession = input.timeAvailable >= 30 && input.timeAvailable < 45;
  const verySoreGroups = maxSorenessGroups(input.sorenessByMuscle as Record<WeakPoint, number>);
  const deloadTrigger =
    input.currentProgramPhase === "deload" ||
    input.missedWorkouts === "1-week-plus" ||
    (readiness.score < 42 && verySoreGroups.length >= 2) ||
    (context.performanceTrend === "declining" && context.recoveryTrend === "strained");

  if (deloadTrigger) {
    return {
      strategy: "Deload day",
      trainingDose: "deload",
      volumeMultiplier: 0.55,
      exerciseCount: shortSession ? 3 : 4,
      targetRir: clamp(profile.targetRir + 2, 3, 5),
      targetRpe: 6,
      progressionAggressiveness: "paused",
      complexity: "low",
      supersetsEnabled: shortSession || compressedSession,
      doseReason: "Recovery, missed time, or program phase triggered a re-entry dose."
    };
  }

  if (shortSession) {
    return {
      strategy: "Express session",
      trainingDose: readiness.score >= 68 ? "moderate" : "low",
      volumeMultiplier: readiness.score >= 68 ? 0.75 : 0.62,
      exerciseCount: 3,
      targetRir: clamp(profile.targetRir + (readiness.score < 68 ? 1 : 0), 2, 4),
      targetRpe: readiness.score >= 68 ? 8 : 7,
      progressionAggressiveness: readiness.score >= 74 ? "normal" : "conservative",
      complexity: "low",
      supersetsEnabled: true,
      doseReason: "Under 30 minutes means highest-value movements only."
    };
  }

  if (context.momentumProtectionMode) {
    return {
      strategy: "Momentum protection day",
      trainingDose: readiness.score >= 62 && !context.momentumRecoveryMode ? "moderate" : "low",
      volumeMultiplier: context.momentumRecoveryMode ? 0.62 : 0.72,
      exerciseCount: compressedSession ? 4 : 5,
      targetRir: clamp(profile.targetRir + 1, 2, 5),
      targetRpe: context.momentumRecoveryMode ? 6 : 7,
      progressionAggressiveness: "conservative",
      complexity: "low",
      supersetsEnabled: compressedSession,
      doseReason: "Momentum Protection Mode reduced friction to preserve adherence."
    };
  }

  if (readiness.score < 52 || input.energy <= 2 || input.sleepQuality <= 2 || input.stressLevel >= 4) {
    return {
      strategy: "Recovery-biased day",
      trainingDose: "low",
      volumeMultiplier: 0.7,
      exerciseCount: compressedSession ? 4 : 5,
      targetRir: clamp(profile.targetRir + 1, 2, 5),
      targetRpe: 7,
      progressionAggressiveness: "conservative",
      complexity: "low",
      supersetsEnabled: compressedSession,
      doseReason: "Low readiness inputs favor a minimum effective dose."
    };
  }

  if (context.weakPoints.length > 0 && readiness.score >= 62 && verySoreGroups.length < 3) {
    return {
      strategy: "Weak-point priority day",
      trainingDose: readiness.score >= 78 ? "high" : "moderate",
      volumeMultiplier: readiness.score >= 78 ? 1.12 : 0.95,
      exerciseCount: input.timeAvailable >= 75 ? 7 : compressedSession ? 5 : 6,
      targetRir: clamp(profile.targetRir + (readiness.score >= 78 ? -1 : 0), 1, 3),
      targetRpe: readiness.score >= 78 ? 9 : 8,
      progressionAggressiveness: readiness.score >= 78 ? "aggressive" : "normal",
      complexity: readiness.score >= 78 && input.crowding !== "packed" ? "high" : "moderate",
      supersetsEnabled: compressedSession,
      doseReason: "Recovery is good enough to place lagging muscles earlier."
    };
  }

  if (readiness.score >= 78 && input.energy >= 4 && input.sleepQuality >= 4 && input.stressLevel <= 3) {
    return {
      strategy: "Push day",
      trainingDose: "high",
      volumeMultiplier: input.timeAvailable >= 75 ? 1.2 : 1.08,
      exerciseCount: input.timeAvailable >= 75 ? 7 : 6,
      targetRir: clamp(profile.targetRir - 1, 1, 3),
      targetRpe: 9,
      progressionAggressiveness: "aggressive",
      complexity: input.crowding === "packed" ? "moderate" : "high",
      supersetsEnabled: compressedSession,
      doseReason: "High readiness supports a controlled progression attempt."
    };
  }

  return {
    strategy: input.timeAvailable < 45 ? "Maintenance day" : "Productive day",
    trainingDose: "moderate",
    volumeMultiplier: input.timeAvailable < 45 ? 0.85 : 1,
    exerciseCount: compressedSession ? 5 : input.timeAvailable >= 75 ? 7 : 6,
    targetRir: profile.targetRir,
    targetRpe: 10 - profile.targetRir,
    progressionAggressiveness: context.performanceTrend === "declining" ? "conservative" : "normal",
    complexity: input.crowding === "packed" || input.stressLevel >= 4 ? "moderate" : "high",
    supersetsEnabled: compressedSession,
    doseReason: "Inputs support productive training without forcing a max-effort day."
  };
}

function inferFocus(input: DailyCheckIn, context: WorkoutEngineContext): BodyFocus {
  if (input.bodyFocus !== "auto") return input.bodyFocus;
  if (input.preferredSplit === "full-body") return "full-body";
  if (input.missedWorkouts !== "none") return "full-body";

  const freshWeakPoint = context.weakPoints.find((point) => (input.sorenessByMuscle[point] ?? 2) <= 3);
  if (freshWeakPoint) return focusForWeakPoint(freshWeakPoint);

  if (input.preferredSplit === "push-pull-legs") {
    if ((input.sorenessByMuscle.chest ?? 2) >= 4 || (input.sorenessByMuscle.shoulders ?? 2) >= 4) return "pull";
    if ((input.sorenessByMuscle.legs ?? 2) >= 4 || (input.sorenessByMuscle.glutes ?? 2) >= 4) return "upper";
    return "push";
  }

  if (input.preferredSplit === "upper-lower") {
    return (input.sorenessByMuscle.legs ?? 2) >= 4 || (input.sorenessByMuscle.glutes ?? 2) >= 4 ? "upper" : "lower";
  }

  if (context.goal === "athletic-performance" || input.preferredSplit === "athletic") return "full-body";
  return "full-body";
}

function targetPatterns(focus: BodyFocus, mode: TrainingGoalMode, dose: DoseDecision) {
  if (focus === "lower") return ["squat", "hinge", "lunge", "anti-extension", "conditioning"];
  if (focus === "upper") return ["horizontal-push", "horizontal-pull", "vertical-pull", "vertical-push", "isolation"];
  if (focus === "push") return ["horizontal-push", "vertical-push", "isolation", "anti-extension"];
  if (focus === "pull") return ["horizontal-pull", "vertical-pull", "hinge", "isolation", "anti-rotation"];
  if (focus === "core") return ["anti-extension", "anti-rotation", "carry", "conditioning"];
  if (focus === "conditioning") return ["conditioning", "lunge", "carry", "anti-extension"];

  const profilePatterns = goalProfiles[mode].priorityPatterns;
  if (dose.strategy === "Express session") return profilePatterns.slice(0, 4);
  return profilePatterns.concat(["vertical-push", "vertical-pull", "anti-extension", "conditioning"]);
}

function injuryFromNotes(notes: string | null) {
  if (!notes) return [];
  const lower = notes.toLowerCase();
  return muscleGroups.filter((group) => lower.includes(group)) as DiscomfortArea[];
}

function affectedByArea(template: ExerciseTemplate, area: DiscomfortArea) {
  if (area === "none") return false;
  const targets = weakPointTargets(area);
  return (
    targets.some((target) => template.primaryTargets.includes(target)) ||
    targets.some((target) => template.secondaryTargets.includes(target)) ||
    template.contraindications.includes(area) ||
    targets.some((target) => template.muscleGroup === target)
  );
}

function weakPointTargets(point: WeakPoint): WeakPoint[] {
  if (point === "quads") return ["legs"];
  if (point === "hamstrings") return ["legs", "glutes"];
  if (point === "calves") return ["legs", "conditioning"];
  return [point];
}

function weakPointMatchesTemplate(template: ExerciseTemplate, point: WeakPoint) {
  const targets = weakPointTargets(point);
  return targets.some(
    (target) =>
      template.primaryTargets.includes(target) ||
      template.secondaryTargets.includes(target) ||
      template.muscleGroup === target
  );
}

function sorenessForWeakPoint(soreness: Record<WeakPoint, number>, point: WeakPoint) {
  const direct = soreness[point];
  if (typeof direct === "number") return direct;
  return Math.min(...weakPointTargets(point).map((target) => soreness[target] ?? 2));
}

function injuryPenalty(template: ExerciseTemplate, input: DailyCheckIn, context: WorkoutEngineContext) {
  const injuryAreas = Array.from(new Set([...input.injuryAreas, ...injuryFromNotes(context.injuryNotes)]));
  if (injuryAreas.some((area) => template.contraindications.includes(area))) return 100;
  if (injuryAreas.some((area) => affectedByArea(template, area))) return 18;
  if (injuryAreas.some((area) => template.saferFor.includes(area))) return -6;
  return 0;
}

function sorenessPenalty(template: ExerciseTemplate, soreness: Record<WeakPoint, number>) {
  const muscleSoreness = template.muscleGroup === "full-body" ? 2 : soreness[template.muscleGroup] ?? 2;
  const directSoreness = Math.max(...template.primaryTargets.map((target) => soreness[target] ?? 2), muscleSoreness);
  const secondarySoreness = Math.max(1, ...template.secondaryTargets.map((target) => soreness[target] ?? 1));

  if (directSoreness >= 5) return 80;
  if (directSoreness >= 4) return 28;
  if (directSoreness === 3) return 8;
  if (secondarySoreness >= 4) return 6;
  return directSoreness <= 2 ? -3 : 0;
}

function equipmentPenalty(template: ExerciseTemplate, input: DailyCheckIn) {
  if (!equipmentFits(template, input.equipment)) return 1000;
  if (input.crowding === "packed") {
    const zonePenalty = template.setupZone === "rack" || template.setupZone === "bench" ? 34 : template.setupZone === "machine" ? 16 : 0;
    return zonePenalty + (6 - template.crowdingFriendliness) * 5 + template.setupComplexity * 2;
  }
  if (input.crowding === "moderate") {
    return (6 - template.crowdingFriendliness) * 2 + template.setupComplexity;
  }
  return template.setupComplexity > 3 ? 1 : 0;
}

function dislikedPenalty(template: ExerciseTemplate, disliked: string[]) {
  const normalized = disliked.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return 0;
  const name = template.name.toLowerCase();
  const pattern = template.movementPattern.toLowerCase();
  const group = template.substitutionGroup.toLowerCase();
  return normalized.some((item) => name.includes(item) || pattern.includes(item) || group.includes(item)) ? 100 : 0;
}

function scoreExercise(
  template: ExerciseTemplate,
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  mode: TrainingGoalMode,
  focus: BodyFocus,
  dose: DoseDecision
) {
  const profile = goalProfiles[mode];
  const soreness = input.sorenessByMuscle as Record<WeakPoint, number>;
  const goalScore = template[profile.primaryScore] * 6 + template[profile.secondaryScore] * 2;
  const targetScore = template.focus.includes(focus) || template.focus.includes("full-body") ? 14 : 0;
  const weakPointScore = context.weakPoints.some((point) => weakPointMatchesTemplate(template, point)) ? 18 : 0;
  const freshWeakPointBonus = context.weakPoints.some(
    (point) => weakPointMatchesTemplate(template, point) && sorenessForWeakPoint(soreness, point) <= 2
  )
    ? 8
    : 0;
  const lowEnergyBonus =
    input.energy <= 2 || input.sleepQuality <= 2
      ? template.stabilityDemand <= 2 && template.fatigueScore <= 3
        ? 10
        : -template.fatigueScore * 4
      : 0;
  const stressBonus = input.stressLevel >= 4 ? (template.setupComplexity <= 2 ? 6 : -template.setupComplexity * 3) : 0;
  const timeBonus = input.timeAvailable < 45 ? (template.setupComplexity <= 2 ? 8 : -template.setupComplexity * 3) : 0;
  const complexityAdjustment =
    dose.complexity === "low"
      ? template.difficulty <= 1 && template.stabilityDemand <= 2
        ? 10
        : -template.difficulty * 5
      : dose.complexity === "high"
        ? template.difficulty >= 2
          ? 4
          : 0
        : 0;

  return (
    goalScore +
    targetScore +
    weakPointScore +
    freshWeakPointBonus +
    lowEnergyBonus +
    stressBonus +
    timeBonus +
    complexityAdjustment -
    template.fatigueScore * (dose.trainingDose === "low" || dose.trainingDose === "deload" ? 3 : 1.2) -
    sorenessPenalty(template, soreness) -
    equipmentPenalty(template, input) -
    injuryPenalty(template, input, context) -
    dislikedPenalty(template, [...input.dislikedExercises, ...context.dislikedExercises])
  );
}

function availableSubstitution(
  template: ExerciseTemplate,
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  debug: ExerciseSelectionDebug
) {
  const candidates = exerciseLibrary
    .filter((exercise) => exercise.substitutionGroup === template.substitutionGroup || template.substituteOptions.includes(exercise.name))
    .filter((exercise) => exercise.name !== template.name)
    .filter((exercise) => equipmentFits(exercise, input.equipment))
    .filter((exercise) => injuryPenalty(exercise, input, context) < 100)
    .sort((a, b) => equipmentPenalty(a, input) + a.fatigueScore - (equipmentPenalty(b, input) + b.fatigueScore));

  const candidate = candidates[0]?.name ?? template.substituteOptions[0] ?? "nearest pain-free variation";

  if (input.crowding === "packed" && (template.setupZone === "rack" || template.setupZone === "bench" || template.setupZone === "machine")) {
    debug.substitutions.push(`${template.name} -> ${candidate} because the gym is packed.`);
  }

  return candidate;
}

function prioritizedMuscles(input: DailyCheckIn, context: WorkoutEngineContext, focus: BodyFocus) {
  const soreness = input.sorenessByMuscle as Record<WeakPoint, number>;
  const fromFocus: WeakPoint[] =
    focus === "lower"
      ? ["legs", "glutes"]
      : focus === "upper"
        ? ["chest", "back", "shoulders"]
        : focus === "push"
          ? ["chest", "shoulders", "arms"]
          : focus === "pull"
            ? ["back", "arms"]
            : focus === "core"
              ? ["core"]
              : focus === "conditioning"
                ? ["conditioning", "legs", "core"]
                : ["back", "legs", "chest", "glutes"];

  const weakPoints = context.weakPoints.filter((point) => sorenessForWeakPoint(soreness, point) <= 3);
  const merged = [...weakPoints, ...fromFocus].filter((point) => sorenessForWeakPoint(soreness, point) < 5);
  return Array.from(new Set(merged)).slice(0, 4);
}

function experienceSetCap(context: WorkoutEngineContext, dose: DoseDecision) {
  const base = context.experienceLevel === "advanced" ? 10 : context.experienceLevel === "intermediate" ? 8 : 6;
  if (dose.trainingDose === "deload") return Math.max(3, base - 4);
  if (dose.trainingDose === "low") return Math.max(4, base - 3);
  if (dose.trainingDose === "high") return base + 1;
  return base;
}

function setCount(
  template: ExerciseTemplate,
  index: number,
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  dose: DoseDecision,
  setsByMuscle: Record<string, number>
) {
  const isMain = index < 2 && template.movementPattern !== "isolation" && template.muscleGroup !== "conditioning";
  const soreness = Math.max(...template.primaryTargets.map((target) => input.sorenessByMuscle[target] ?? 2));
  const base = isMain ? 3 : template.movementPattern === "isolation" ? 2 : 2;
  const adjusted = Math.round(base * dose.volumeMultiplier + (dose.trainingDose === "high" && isMain ? 1 : 0));
  const sorenessTrim = soreness >= 4 ? 1 : 0;
  const cap = experienceSetCap(context, dose);
  const current = setsByMuscle[template.muscleGroup] ?? 0;
  const remaining = Math.max(1, cap - current);
  const sets = clamp(adjusted - sorenessTrim, 1, Math.min(5, remaining));
  setsByMuscle[template.muscleGroup] = current + sets;
  return sets;
}

function repsForExercise(template: ExerciseTemplate, mode: TrainingGoalMode) {
  const profile = goalProfiles[mode];
  if (template.muscleGroup === "conditioning") return "30-45 sec";
  if (template.movementPattern === "carry") return "30-40 yd";
  if (template.movementPattern === "isolation") return profile.isolationRepRange;
  if ((mode === "strength" || mode === "athletic-performance") && template.strengthRating >= 4) return profile.strengthRepRange;
  return profile.repRange;
}

function restForExercise(template: ExerciseTemplate, mode: TrainingGoalMode, input: DailyCheckIn, dose: DoseDecision) {
  if (dose.supersetsEnabled) return "30-60 sec between pair";
  if (input.timeAvailable < 30) return "30-45 sec";
  if (template.muscleGroup === "conditioning") return "30 sec";
  if (mode === "strength" && template.strengthRating >= 4) return "2-3 min";
  return goalProfiles[mode].rest;
}

function buildRationale(template: ExerciseTemplate, input: DailyCheckIn, context: WorkoutEngineContext, dose: DoseDecision) {
  const reasons: string[] = [];
  if (context.weakPoints.some((point) => weakPointMatchesTemplate(template, point))) {
    reasons.push("prioritized because it targets a weak point early");
  }
  if (input.crowding === "packed" && template.crowdingFriendliness >= 4) {
    reasons.push("chosen because it is low-wait in a packed gym");
  }
  if (input.energy <= 2 && template.fatigueScore <= 2) {
    reasons.push("kept low-fatigue for today's energy");
  }
  if (input.timeAvailable < 45 && template.setupComplexity <= 2) {
    reasons.push("efficient setup keeps the session compressed");
  }
  if (template.saferFor.some((area) => input.injuryAreas.includes(area))) {
    reasons.push("safer option for the limitation you flagged");
  }
  if (dose.trainingDose === "high" && template[goalProfiles[goalModeFromFitnessGoal(context.goal)].primaryScore] >= 4) {
    reasons.push("high stimulus choice for today's dose");
  }
  return reasons.length > 0 ? `Selected because it is ${reasons.join(", ")}.` : "Selected to preserve the target movement pattern with manageable fatigue.";
}

function buildPrescription(
  template: ExerciseTemplate,
  index: number,
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  mode: TrainingGoalMode,
  dose: DoseDecision,
  setsByMuscle: Record<string, number>,
  debug: ExerciseSelectionDebug
): ExercisePrescription {
  const profile = goalProfiles[mode];
  const substitution = availableSubstitution(template, input, context, debug);
  const rirAdjustment =
    (input.sleepQuality <= 2 ? 1 : 0) +
    (input.stressLevel >= 4 ? 1 : 0) +
    (Math.max(...template.primaryTargets.map((target) => input.sorenessByMuscle[target] ?? 2)) >= 4 ? 1 : 0);
  const targetRir = clamp(dose.targetRir + rirAdjustment, 1, 5);
  const targetRpe = 10 - targetRir;
  const supersetWith =
    dose.supersetsEnabled && index % 2 === 0 && index < dose.exerciseCount - 1 ? `Pair with exercise ${index + 2}` : undefined;
  const directInjury = input.injuryAreas.find((area) => affectedByArea(template, area));

  return {
    name: template.name,
    muscleGroup: template.muscleGroup,
    primaryTargets: template.primaryTargets,
    secondaryTargets: template.secondaryTargets,
    equipment: template.equipment,
    movementPattern: template.movementPattern,
    fatigueScore: template.fatigueScore,
    stimulusToFatigue: Number((template[profile.primaryScore] / template.fatigueScore).toFixed(1)),
    targetRir,
    targetRpe,
    tempo: dose.trainingDose === "deload" ? "Smooth 3 sec down / easy up" : mode === "strength" ? "Controlled eccentric / powerful concentric" : "2 sec down / controlled up",
    sets: setCount(template, index, input, context, dose, setsByMuscle),
    reps: repsForExercise(template, mode),
    rest: restForExercise(template, mode, input, dose),
    cue: template.cue,
    substitution:
      input.crowding === "packed"
        ? `${substitution} if waiting would break flow.`
        : directInjury
          ? `${substitution} if ${toTitleCase(directInjury)} feels limited.`
          : `${substitution} if equipment or comfort changes.`,
    progressionRule:
      dose.progressionAggressiveness === "paused"
        ? "No load jumps today. Match clean reps and rebuild momentum."
        : dose.progressionAggressiveness === "aggressive"
          ? "If all sets hit the top target at RIR 1-2, add a small load jump next time."
          : "Add reps first. Add load only when all sets hit target RIR.",
    adaptation:
      dose.trainingDose === "deload"
        ? "Deload rule: stop each set before speed or range changes."
        : input.timeAvailable < 45
          ? "Compressed session rule: keep setup tight and move to the next station quickly."
          : "Use the listed RIR instead of chasing failure.",
    rationale: buildRationale(template, input, context, dose),
    supersetWith,
    safetyNote: directInjury ? `Avoid this if it creates sharp pain or changes your mechanics around ${toTitleCase(directInjury)}.` : undefined
  };
}

function chooseExercises(
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  mode: TrainingGoalMode,
  focus: BodyFocus,
  dose: DoseDecision
) {
  const patterns = targetPatterns(focus, mode, dose);
  const debug: ExerciseSelectionDebug = { substitutions: [], avoided: [] };
  const scored = exerciseLibrary
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, input, context, mode, focus, dose) }))
    .sort((a, b) => b.score - a.score);
  const chosen: ExerciseTemplate[] = [];

  for (const { exercise, score } of scored) {
    if (score <= -50) {
      debug.avoided.push(`${exercise.name} removed by equipment, soreness, injury, or preference filters.`);
    }
  }

  const priorities = prioritizedMuscles(input, context, focus);
  for (const priority of priorities) {
    if (chosen.length >= Math.min(2, dose.exerciseCount)) break;
    const match = scored.find(
      ({ exercise, score }) =>
        score > -50 &&
        weakPointMatchesTemplate(exercise, priority) &&
        !chosen.includes(exercise) &&
        sorenessForWeakPoint(input.sorenessByMuscle as Record<WeakPoint, number>, priority) <= 3
    )?.exercise;
    if (match) chosen.push(match);
  }

  for (const pattern of patterns) {
    if (chosen.length >= dose.exerciseCount) break;
    const match = scored.find(
      ({ exercise, score }) =>
        score > -50 &&
        exercise.movementPattern === pattern &&
        !chosen.includes(exercise) &&
        !chosen.some((item) => item.substitutionGroup === exercise.substitutionGroup && chosen.length < 4)
    )?.exercise;
    if (match) chosen.push(match);
  }

  for (const { exercise, score } of scored) {
    if (chosen.length >= dose.exerciseCount) break;
    if (score <= -50 || chosen.includes(exercise)) continue;
    const duplicateGroup = chosen.some((item) => item.substitutionGroup === exercise.substitutionGroup);
    if (duplicateGroup && chosen.length < 5) continue;
    chosen.push(exercise);
  }

  const setsByMuscle: Record<string, number> = {};
  const prescriptions = chosen
    .slice(0, dose.exerciseCount)
    .map((exercise, index) => buildPrescription(exercise, index, input, context, mode, dose, setsByMuscle, debug));

  return { exercises: prescriptions, debug };
}

function buildInputImpacts(input: DailyCheckIn, context: WorkoutEngineContext, readiness: ReadinessResult, dose: DoseDecision): InputImpact[] {
  const soreGroups = maxSorenessGroups(input.sorenessByMuscle as Record<WeakPoint, number>);
  return [
    {
      signal: "Energy",
      value: `${input.energy}/5`,
      effect: input.energy <= 2 ? "Volume reduced, PR attempts removed, stable exercises favored." : input.energy >= 4 ? "Progression and harder compounds are available." : "Normal workload with RIR guardrails.",
      level: input.energy <= 2 ? "caution" : input.energy >= 4 ? "positive" : "neutral"
    },
    {
      signal: "Sleep",
      value: `${input.sleepQuality}/5`,
      effect: input.sleepQuality <= 2 ? "Intensity reduced and failure proximity moved farther away." : input.sleepQuality >= 4 ? "Normal intensity is allowed." : "Moderate intensity with no forced max effort.",
      level: input.sleepQuality <= 2 ? "caution" : input.sleepQuality >= 4 ? "positive" : "neutral"
    },
    {
      signal: "Stress",
      value: `${input.stressLevel}/5`,
      effect: input.stressLevel >= 4 ? "Exercise complexity and total volume trimmed." : input.stressLevel <= 2 ? "Normal progression and complexity allowed." : "Kept productive but not chaotic.",
      level: input.stressLevel >= 4 ? "caution" : input.stressLevel <= 2 ? "positive" : "neutral"
    },
    {
      signal: "Soreness",
      value: soreGroups.length > 0 ? soreGroups.map(toTitleCase).join(", ") : `${input.soreness}/5 average`,
      effect: soreGroups.length > 0 ? "Direct work reduced or avoided for sore groups." : "No major soreness cap needed.",
      level: soreGroups.length > 0 ? "caution" : "positive"
    },
    {
      signal: "Time",
      value: `${input.timeAvailable} min`,
      effect: input.timeAvailable < 30 ? "Express workout: highest-value exercises only." : input.timeAvailable < 45 ? "Supersets enabled and setup changes reduced." : input.timeAvailable >= 75 ? "Full session with accessories allowed." : "Standard session length.",
      level: input.timeAvailable < 45 ? "caution" : "positive"
    },
    {
      signal: "Gym crowding",
      value: toTitleCase(input.crowding),
      effect: input.crowding === "packed" ? "Rack and bench dependence reduced; low-setup substitutions prioritized." : "Normal equipment choices remain available.",
      level: input.crowding === "packed" ? "caution" : "neutral"
    },
    {
      signal: "Weak points",
      value: context.weakPoints.length > 0 ? context.weakPoints.map(toTitleCase).join(", ") : "None selected",
      effect: context.weakPoints.length > 0 && readiness.score >= 52 ? "Fresh weak points were moved earlier and given first access to volume." : "No extra weak-point volume added today.",
      level: context.weakPoints.length > 0 ? "positive" : "neutral"
    },
    {
      signal: "Missed workouts",
      value: toTitleCase(input.missedWorkouts),
      effect: input.missedWorkouts === "none" ? "Normal weekly flow preserved." : "Catch-up logic merged priorities without punishment volume.",
      level: input.missedWorkouts === "none" ? "neutral" : "caution"
    },
    {
      signal: "Performance trend",
      value: toTitleCase(context.performanceTrend),
      effect: context.performanceTrend === "declining" ? "Aggressive overload paused." : context.performanceTrend === "improving" ? "Progression is allowed if RIR targets are hit." : "Progression stays conservative.",
      level: context.performanceTrend === "declining" ? "caution" : context.performanceTrend === "improving" ? "positive" : "neutral"
    },
    {
      signal: "Momentum",
      value: `${context.momentumScore}/100 ${context.momentumState}`,
      effect: context.momentumProtectionMode
        ? "Session shortened, setup simplified, and failure work removed to protect consistency."
        : context.momentumState === "High Momentum"
          ? "Normal progression remains available while recovery holds."
          : "Training dose keeps the trajectory repeatable.",
      level: context.momentumProtectionMode ? "caution" : context.momentumState === "High Momentum" ? "positive" : "neutral"
    },
    {
      signal: "Training dose",
      value: toTitleCase(dose.trainingDose),
      effect: dose.doseReason,
      level: dose.trainingDose === "high" ? "positive" : dose.trainingDose === "low" || dose.trainingDose === "deload" ? "caution" : "neutral"
    }
  ];
}

function weeklyVolumeTarget(mode: TrainingGoalMode, context: WorkoutEngineContext, dose: DoseDecision) {
  const [minSets, maxSets] = goalProfiles[mode].weeklySets;
  const experienceBump = context.experienceLevel === "advanced" ? 2 : context.experienceLevel === "beginner" ? -2 : 0;
  const recoveryTrim = dose.trainingDose === "low" || dose.trainingDose === "deload" ? -2 : dose.trainingDose === "high" ? 1 : 0;
  const low = Math.max(4, minSets + experienceBump + recoveryTrim);
  const high = Math.max(low + 2, maxSets + experienceBump + recoveryTrim);
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

function workoutName(mode: TrainingGoalMode, dose: DoseDecision, focus: BodyFocus) {
  if (dose.strategy === "Deload day") return "Adaptive Deload Rebuild";
  if (dose.strategy === "Momentum protection day") return "Momentum Protection Session";
  if (dose.strategy === "Express session") return "Express Physique Dose";
  if (dose.strategy === "Weak-point priority day") return `${toTitleCase(focus)} Weak-Point Builder`;
  if (mode === "athletic-performance") return "Athletic Output Session";
  if (mode === "hypertrophy") return "Adaptive Physique Builder";
  if (mode === "strength" && dose.trainingDose === "high") return "Strength Progression Day";
  if (mode === "fat-loss") return "Lean Conditioning Lift";
  return "Adaptive Recomposition Session";
}

function buildCooldown(dose: DoseDecision, input: DailyCheckIn) {
  if (dose.trainingDose === "high") {
    return ["2 minutes easy walk", "Long exhale breathing x 5", "Light stretch for the hardest-trained muscle"];
  }
  if (input.stressLevel >= 4 || input.sleepQuality <= 2) {
    return ["3 minutes easy walk", "Downshift breathing: 4 sec inhale / 6 sec exhale", "Gentle mobility only, no aggressive stretching"];
  }
  return ["2 minutes easy walk", "One mobility drill for the tightest area", "Log energy and soreness while it is fresh"];
}

function buildExplanation(
  input: DailyCheckIn,
  context: WorkoutEngineContext,
  readiness: ReadinessResult,
  dose: DoseDecision,
  focus: BodyFocus,
  priorities: WeakPoint[]
) {
  const soreGroups = maxSorenessGroups(input.sorenessByMuscle as Record<WeakPoint, number>);
  const avoid = [
    input.sleepQuality <= 2 ? "Avoid max-effort sets after poor sleep." : null,
    input.energy <= 2 ? "Avoid PR attempts or grinding reps." : null,
    input.stressLevel >= 4 ? "Avoid complex station-hopping circuits." : null,
    input.crowding === "packed" ? "Avoid waiting for racks or benches when a close substitute works." : null,
    soreGroups.length > 0 ? `Avoid high direct volume for ${soreGroups.map(toTitleCase).join(", ")}.` : null,
    input.injuryAreas.length > 0 ? `Avoid movements that aggravate ${input.injuryAreas.map(toTitleCase).join(", ")}.` : null
  ].filter(Boolean) as string[];

  return {
    whyThisWorkout: `Readiness is ${readiness.score}/100 (${readiness.label}), so the engine chose a ${dose.strategy.toLowerCase()} with ${Math.round(dose.volumeMultiplier * 100)}% of normal volume and RIR ${dose.targetRir}.`,
    whatChanged: [
      `Training dose set to ${dose.trainingDose} because ${dose.doseReason}`,
      input.timeAvailable < 45 ? "Time limit enabled supersets and reduced exercise count." : "Time available supports a standard exercise count.",
      input.crowding === "packed" ? "Crowding logic lowered rack, bench, and machine dependence." : "Crowding did not require major station swaps.",
      context.performanceTrend === "declining" ? "Progression is conservative because recent performance is declining." : "Progression remains available when RIR targets are hit.",
      input.missedWorkouts === "none" ? "No missed-day catch-up was needed." : "Missed-workout logic merged priorities without punishment volume.",
      context.momentumProtectionMode
        ? "Momentum Protection Mode shortened the plan and reduced setup complexity."
        : "Momentum is stable enough for the planned structure."
    ],
    todayMainFocus: `Prioritize ${priorities.map(toTitleCase).join(", ")} inside a ${toTitleCase(focus)} structure.`,
    whatToAvoid: avoid.length > 0 ? avoid : ["Avoid changing the goal mid-session. Execute clean reps and leave when the plan is done."],
    progressNextTime:
      dose.progressionAggressiveness === "paused"
        ? "Next time, repeat this session or add one set only if recovery rebounds."
        : dose.progressionAggressiveness === "aggressive"
          ? "Next time, add load or reps on the first two lifts if all sets land at target RIR."
          : "Next time, progress by adding reps first, then load after the top of the range is clean.",
    safety: [
      `${APP_NAME} is educational and not a medical diagnosis.`,
      "Stop if you feel sharp pain, chest pain, severe dizziness, unusual shortness of breath, or injury symptoms.",
      "For injuries or persistent pain, consult a qualified clinician or coach."
    ]
  };
}

function buildCondensed(exercises: ExercisePrescription[], dose: DoseDecision) {
  const firstMoves = exercises.slice(0, Math.min(3, exercises.length));
  return [
    "Run the warmup for 3 minutes.",
    `Do ${firstMoves.map((exercise) => exercise.name).join(", ")} for 2 focused rounds.`,
    `Keep every set around RPE ${dose.targetRpe} and stop if reps get sloppy.`,
    "Finish with one easy walk, stretch, or breathing minute."
  ];
}

function buildNotes(input: DailyCheckIn, readiness: ReadinessResult, dose: DoseDecision) {
  return [
    readiness.recommendedStrategy,
    contextMomentumNote(input, dose),
    dose.supersetsEnabled ? "Supersets are enabled because time is limited." : "No forced supersets; use full rest for quality.",
    input.injuryAreas.length > 0 ? "Injury safeguards are active. Pain-free range beats loading today." : "No injury limitation was flagged.",
    "No daily max-effort work is recommended. The plan caps fatigue by RIR and set volume."
  ];
}

function contextMomentumNote(input: DailyCheckIn, dose: DoseDecision) {
  if (dose.strategy === "Momentum protection day") {
    return input.timeAvailable < 45
      ? "Momentum Protection Mode is active: short, simple, and startable."
      : "Momentum Protection Mode is active: reduced friction before adherence drops.";
  }

  return "Momentum is monitored through adherence, recovery, and comeback behavior.";
}

export function generateAdaptiveWorkout(
  input: DailyCheckIn,
  partialContext: Partial<WorkoutEngineContext> = {}
): GeneratedWorkout {
  const context = normalizeContext(partialContext);
  const normalizedInput = normalizeInput(input);
  const mode = goalModeFromFitnessGoal(context.goal);
  const readiness = calculateReadiness(normalizedInput, context);
  const dose = decideDose(normalizedInput, context, readiness);
  const focus = inferFocus(normalizedInput, context);
  const priorities = prioritizedMuscles(normalizedInput, context, focus);
  const { exercises, debug } = chooseExercises(normalizedInput, context, mode, focus, dose);
  const explanation = buildExplanation(normalizedInput, context, readiness, dose, focus, priorities);
  const recoveryScore = Math.round(
    clamp(readiness.score + (normalizedInput.stressLevel <= 2 ? 5 : 0) - (normalizedInput.soreness >= 4 ? 8 : 0), 15, 98)
  );

  return {
    id: createId("workout"),
    name: workoutName(mode, dose, focus),
    duration: normalizedInput.timeAvailable,
    focus,
    trainingGoal: mode,
    intensity: dose.trainingDose === "high" ? "push" : dose.trainingDose === "low" || dose.trainingDose === "deload" ? "restore" : "steady",
    readinessLabel: readiness.label,
    readinessScore: readiness.score,
    recoveryScore,
    trainingDose: dose.trainingDose,
    strategy: dose.strategy,
    todayStrategy: `${dose.strategy}: ${dose.doseReason}`,
    volumeMultiplier: dose.volumeMultiplier,
    prioritizedMuscleGroups: priorities,
    targetRir: dose.targetRir,
    targetRpe: dose.targetRpe,
    weeklyVolumeTarget: weeklyVolumeTarget(mode, context, dose),
    deload: {
      active: dose.trainingDose === "deload",
      reason: dose.trainingDose === "deload" ? dose.doseReason : "No deload trigger detected.",
      adjustment:
        dose.trainingDose === "deload"
          ? "Use roughly 55% of normal volume, keep 3-5 reps in reserve, and leave better than you arrived."
          : "Use the planned effort targets and stop when rep quality drops."
    },
    progression: {
      estimatedOneRepMax:
        mode === "strength"
          ? "Use Epley estimate once load is logged: weight x (1 + reps / 30)."
          : "Track top-set load/reps on the first two lifts to guide next time.",
      performanceTrend: `Recent performance trend: ${context.performanceTrend}.`,
      adherence: adherenceStatus(context),
      weeklyVolume: volumeStatus(mode, context),
      recoveryTrend: `Recovery trend: ${context.recoveryTrend}.`
    },
    adaptationNotes: readiness.increasing.concat(readiness.decreasing).slice(0, 6),
    inputImpacts: buildInputImpacts(normalizedInput, context, readiness, dose),
    explanation,
    cooldown: buildCooldown(dose, normalizedInput),
    notes: buildNotes(normalizedInput, readiness, dose),
    inputSnapshot: normalizedInput,
    debug: {
      readinessCalculation: readiness.calculation,
      volumeMultiplier: dose.volumeMultiplier,
      exerciseSubstitutions: debug.substitutions,
      selectedPriorities: priorities.map(toTitleCase),
      avoidedExercises: debug.avoided.slice(0, 10),
      finalReasoning: explanation.whatChanged
    },
    warmup: warmupsByDose[dose.trainingDose],
    exercises,
    why: [
      explanation.whyThisWorkout,
      `Goal profile: ${goalProfiles[mode].label} using ${goalProfiles[mode].repRange} rep targets and ${goalProfiles[mode].rest} rest.`,
      normalizedInput.crowding === "packed"
        ? "Packed-gym logic selected lower-setup exercises and substitutions."
        : "Exercise selection kept normal equipment options open.",
      normalizedInput.injuryAreas.length > 0
        ? `Injury guardrails are active for ${normalizedInput.injuryAreas.map(toTitleCase).join(", ")}.`
        : "No injury area was flagged, so standard options remained available."
    ],
    condensed: buildCondensed(exercises, dose)
  };
}

export function generateWorkout(input: DailyCheckIn, partialContext: Partial<WorkoutEngineContext> = {}) {
  return generateAdaptiveWorkout(input, partialContext);
}
