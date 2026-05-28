import type {
  BiggestStruggle,
  BodyFocus,
  DiscomfortArea,
  EquipmentAccess,
  ExperienceLevel,
  FitnessGoal,
  GymCrowding,
  MissedWorkoutWindow,
  PreferredSplit,
  ProgramPhase,
  WeakPoint
} from "@/lib/types";

export const fitnessGoals: { value: FitnessGoal; label: string; copy: string }[] = [
  { value: "lose-fat", label: "Lose fat", copy: "Lean, efficient sessions" },
  { value: "build-muscle", label: "Build muscle", copy: "Progressive hypertrophy" },
  { value: "recomposition", label: "Recomposition", copy: "Strength plus consistency" },
  { value: "strength", label: "Strength", copy: "Practice heavy patterns" },
  { value: "athletic-performance", label: "Athletic performance", copy: "Power, resilience, and output" },
  { value: "general-health", label: "General health", copy: "Move well and feel better" }
];

export const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" }
];

export const equipmentOptions: { value: EquipmentAccess; label: string }[] = [
  { value: "full-gym", label: "Full gym" },
  { value: "home-gym", label: "Home gym" },
  { value: "dumbbells-only", label: "Dumbbells only" },
  { value: "barbell-rack", label: "Barbell + rack" },
  { value: "machines", label: "Machines" },
  { value: "cables", label: "Cables" },
  { value: "bands", label: "Resistance bands" },
  { value: "bodyweight", label: "Bodyweight" }
];

export const struggles: { value: BiggestStruggle; label: string }[] = [
  { value: "consistency", label: "Consistency" },
  { value: "diet", label: "Diet" },
  { value: "motivation", label: "Motivation" },
  { value: "time", label: "Time" },
  { value: "gym-anxiety", label: "Gym anxiety" },
  { value: "not-knowing-what-to-do", label: "Not knowing what to do" }
];

export const weakPoints: { value: WeakPoint; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "back", label: "Back" },
  { value: "legs", label: "Legs" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "glutes", label: "Glutes" },
  { value: "calves", label: "Calves" },
  { value: "core", label: "Core" },
  { value: "conditioning", label: "Conditioning" }
];

export const crowdingOptions: { value: GymCrowding; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: "moderate", label: "Moderate" },
  { value: "packed", label: "Packed" }
];

export const bodyFocusOptions: { value: BodyFocus; label: string }[] = [
  { value: "auto", label: "Auto-fit today" },
  { value: "full-body", label: "Full body" },
  { value: "upper", label: "Upper" },
  { value: "lower", label: "Lower" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "core", label: "Core" },
  { value: "conditioning", label: "Conditioning" }
];

export const missedWorkoutOptions: { value: MissedWorkoutWindow; label: string }[] = [
  { value: "none", label: "No missed days" },
  { value: "1-day", label: "Missed 1 day" },
  { value: "2-3-days", label: "Missed 2-3 days" },
  { value: "1-week-plus", label: "Missed 1 week+" }
];

export const discomfortOptions: { value: DiscomfortArea; label: string }[] = [
  { value: "none", label: "No discomfort" },
  ...weakPoints.map((point) => ({ value: point.value, label: point.label }))
];

export const preferredSplitOptions: { value: PreferredSplit; label: string }[] = [
  { value: "auto", label: "Auto-select" },
  { value: "full-body", label: "Full body" },
  { value: "upper-lower", label: "Upper/lower" },
  { value: "push-pull-legs", label: "Push/pull/legs" },
  { value: "body-part", label: "Physique focus" },
  { value: "athletic", label: "Athletic" }
];

export const programPhaseOptions: { value: ProgramPhase; label: string }[] = [
  { value: "base", label: "Base building" },
  { value: "build", label: "Progressive build" },
  { value: "intensification", label: "Harder training block" },
  { value: "deload", label: "Deload" },
  { value: "return", label: "Return after time off" }
];
