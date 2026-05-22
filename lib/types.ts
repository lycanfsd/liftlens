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

export type BodyFocus =
  | "auto"
  | "full-body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "core"
  | "conditioning";

export type DailyCheckIn = {
  timeAvailable: number;
  energy: number;
  soreness: number;
  equipment: EquipmentAccess;
  crowding: GymCrowding;
  bodyFocus: BodyFocus;
};

export type ExercisePrescription = {
  name: string;
  muscleGroup: WeakPoint | "full-body";
  equipment: EquipmentAccess | "cable" | "barbell" | "machine" | "kettlebell";
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
  intensity: "restore" | "steady" | "push";
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
