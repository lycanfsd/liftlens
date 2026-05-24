export type FitnessGoal =
  | "lose-fat"
  | "build-muscle"
  | "recomposition"
  | "strength"
  | "general-health";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type EquipmentAccess =
  | "full-gym"
  | "home-gym"
  | "dumbbells-only"
  | "bodyweight";

export type BiggestStruggle =
  | "consistency"
  | "diet"
  | "motivation"
  | "time"
  | "gym-anxiety"
  | "not-knowing-what-to-do";

export type WeakPoint =
  | "chest"
  | "shoulders"
  | "arms"
  | "back"
  | "legs"
  | "glutes"
  | "core"
  | "conditioning";

export type GymCrowding = "empty" | "moderate" | "packed";

export type TrainingGoalMode =
  | "hypertrophy"
  | "strength"
  | "fat-loss"
  | "recomposition"
  | "general-fitness";

export type BodyFocus =
  | "auto"
  | "full-body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "core"
  | "conditioning";

export type MissedWorkoutWindow = "none" | "1-day" | "2-3-days" | "1-week-plus";

export type DiscomfortArea = WeakPoint | "none";

export type DailyCheckIn = {
  timeAvailable: number;
  energy: number;
  soreness: number;
  sleepQuality: number;
  equipment: EquipmentAccess;
  crowding: GymCrowding;
  bodyFocus: BodyFocus;
  missedWorkouts: MissedWorkoutWindow;
  discomfortArea: DiscomfortArea;
};

export type ExercisePrescription = {
  name: string;
  muscleGroup: WeakPoint | "full-body";
  equipment: EquipmentAccess | "cable" | "barbell" | "machine" | "kettlebell";
  movementPattern?: string;
  targetRir?: number;
  targetRpe?: number;
  tempo?: string;
  fatigueScore?: number;
  stimulusToFatigue?: number;
  progressionRule?: string;
  adaptation?: string;
  sets: number;
  reps: string;
  rest: string;
  cue: string;
  substitution: string;
};

export type GeneratedWorkout = {
  id: string;
  name: string;
  duration: number;
  focus: BodyFocus;
  trainingGoal?: TrainingGoalMode;
  intensity: "restore" | "steady" | "push";
  readinessScore?: number;
  recoveryScore?: number;
  targetRir?: number;
  targetRpe?: number;
  weeklyVolumeTarget?: string;
  deload?: {
    active: boolean;
    reason: string;
    adjustment: string;
  };
  progression?: {
    estimatedOneRepMax: string;
    performanceTrend: string;
    adherence: string;
    weeklyVolume: string;
    recoveryTrend: string;
  };
  adaptationNotes?: string[];
  warmup: string[];
  exercises: ExercisePrescription[];
  why: string[];
  condensed: string[];
};

export type RecoveryWindow = "1-day" | "2-3-days" | "1-week-plus";

export type RecoveryPlan = {
  title: string;
  reassurance: string;
  today: string[];
  nextWorkout: string[];
  weeklyReset: string[];
};

export type WeakPointPlan = {
  weakPoint: WeakPoint;
  accessories: string[];
  frequency: string;
  commonMistakes: string[];
  progressMetric: string;
};

export type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  trend?: string;
};

export type WorkoutHistoryItem = {
  id: string;
  date: string;
  workoutName: string;
  duration: number;
  focus: string;
  energy: number;
  soreness: number;
  completedExercises: number;
};

export type AppUserIdentity = {
  userId: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  planType: "Free" | "Pro" | "Elite";
  hasPremiumAccess: boolean;
  devPremiumEnabled: boolean;
};
