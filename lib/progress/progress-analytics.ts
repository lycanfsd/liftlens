import {
  addLocalDays,
  dayMs,
  getLocalDateKey,
  getLocalDateKeyFromMaybeDate,
  getLocalToday,
  getStartOfLocalMonth,
  getStartOfLocalWeek,
  parseLocalDateKey
} from "@/lib/dates";
import type { PRHistoryEntry } from "@/lib/progress/pr-history";

export type ProgressWorkoutLog = {
  id: string;
  workoutId?: string | null;
  workoutDate?: string;
  title?: string | null;
  completedAt: string;
  duration: number;
  focus: string;
  energy?: number | null;
  soreness?: number | null;
  completedExercises?: number | null;
};

export type ExercisePerformanceEntry = {
  id: string;
  workoutId?: string | null;
  date: string;
  exerciseName: string;
  muscleGroup?: string | null;
  sets: number;
  reps: number;
  weight?: number | null;
  isDemo?: boolean;
};

export type MuscleGroupName =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Core";

export type MuscleGroupVolume = {
  muscleGroup: MuscleGroupName;
  sets: number;
  targetMin: number;
  targetMax: number;
  status: "Low" | "On track" | "High";
  insight: string;
};

export type StrengthProgressItem = {
  lift: string;
  currentEstimatedOneRepMax: number;
  previousEstimatedOneRepMax: number;
  percentChange: number;
  isPr: boolean;
  isDemo: boolean;
};

export type ConsistencyAnalytics = {
  completedThisWeek: number;
  completedThisMonth: number;
  weeklyTarget: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  missedThisWeek: number;
  weekDays: Array<{
    label: string;
    date: string;
    completed: boolean;
    isToday: boolean;
  }>;
};

export type ProgressOverview = {
  completionRate: string;
  completionSubtext: string;
  currentStreak: string;
  streakSubtext: string;
  weeklyVolume: string;
  weeklyVolumeSubtext: string;
  strengthProgress: string;
  strengthSubtext: string;
  recoveryScore: string;
  recoverySubtext: string;
};

export type RecentCompletedWorkout = {
  id: string;
  date: string;
  title: string;
  totalSets: number;
  totalVolume: number;
  completedAt: string;
};

export type ProgressAnalytics = {
  overview: ProgressOverview;
  consistency: ConsistencyAnalytics;
  strength: StrengthProgressItem[];
  muscleGroups: MuscleGroupVolume[];
  recentWorkouts: RecentCompletedWorkout[];
  imbalanceInsights: string[];
  coachInsights: string[];
  hasRealWorkoutData: boolean;
  hasRealLoadData: boolean;
  hasRealPrData: boolean;
};

const muscleTargets: Record<MuscleGroupName, { min: number; max: number }> = {
  Chest: { min: 10, max: 20 },
  Back: { min: 10, max: 20 },
  Shoulders: { min: 8, max: 16 },
  Biceps: { min: 6, max: 14 },
  Triceps: { min: 6, max: 14 },
  Quads: { min: 8, max: 16 },
  Hamstrings: { min: 8, max: 16 },
  Glutes: { min: 8, max: 20 },
  Calves: { min: 6, max: 14 },
  Core: { min: 6, max: 14 }
};

const targetOrder = Object.keys(muscleTargets) as MuscleGroupName[];

function getDateKey(date: Date) {
  return getLocalDateKey(date);
}

function weekStart(date = new Date()) {
  return getStartOfLocalWeek(date);
}

function monthStart(date = new Date()) {
  return getStartOfLocalMonth(date);
}

function isAfterOrSame(date: string, boundary: Date) {
  return parseLocalDateKey(getLocalDateKeyFromMaybeDate(date)).getTime() >= boundary.getTime();
}

function logDateKey(log: ProgressWorkoutLog) {
  return log.workoutDate ?? getLocalDateKeyFromMaybeDate(log.completedAt);
}

function isLogAfterOrSame(log: ProgressWorkoutLog, boundary: Date) {
  return parseLocalDateKey(logDateKey(log)).getTime() >= boundary.getTime();
}

function parseNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function estimateOneRepMax(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

function completionDates(logs: ProgressWorkoutLog[]) {
  return new Set(logs.map(logDateKey));
}

function calculateCurrentStreak(logs: ProgressWorkoutLog[]) {
  const dates = completionDates(logs);
  if (!dates.size) return 0;

  let cursor = getLocalToday();
  const todayKey = getDateKey(cursor);

  if (!dates.has(todayKey)) {
    cursor = addLocalDays(cursor, -1);
    if (!dates.has(getDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (dates.has(getDateKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}

function calculateBestStreak(logs: ProgressWorkoutLog[]) {
  const sorted = Array.from(completionDates(logs)).sort();
  if (!sorted.length) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = parseLocalDateKey(sorted[index - 1]).getTime();
    const next = parseLocalDateKey(sorted[index]).getTime();
    if (next - previous === dayMs) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function buildWeekDays(logs: ProgressWorkoutLog[]) {
  const start = weekStart();
  const dates = completionDates(logs);
  const todayKey = getDateKey(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(start, index);
    const dateKey = getDateKey(date);
    return {
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      date: dateKey,
      completed: dates.has(dateKey),
      isToday: dateKey === todayKey
    };
  });
}

function calculateConsistency(logs: ProgressWorkoutLog[], weeklyTarget: number): ConsistencyAnalytics {
  const startOfWeek = weekStart();
  const startOfMonth = monthStart();
  const completedThisWeek = logs.filter((log) => isLogAfterOrSame(log, startOfWeek)).length;
  const completedThisMonth = logs.filter((log) => isLogAfterOrSame(log, startOfMonth)).length;
  const target = Math.max(1, weeklyTarget);

  return {
    completedThisWeek,
    completedThisMonth,
    weeklyTarget: target,
    completionRate: Math.min(100, Math.round((completedThisWeek / target) * 100)),
    currentStreak: calculateCurrentStreak(logs),
    bestStreak: calculateBestStreak(logs),
    missedThisWeek: Math.max(0, target - completedThisWeek),
    weekDays: buildWeekDays(logs)
  };
}

function normalizeLiftName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("bench") || lower.includes("chest press")) return "Bench Press";
  if (lower.includes("squat") || lower.includes("leg press")) return "Squat";
  if (lower.includes("deadlift") || lower.includes("romanian") || lower.includes("rdl")) return "Deadlift";
  if (lower.includes("shoulder press") || lower.includes("overhead") || lower.includes("landmine")) return "Overhead Press";
  if (lower.includes("row")) return "Row";
  if (lower.includes("pull-up") || lower.includes("pulldown") || lower.includes("chin-up")) return "Pull-up / Pulldown";
  return name;
}

function strengthProgress(entries: ExercisePerformanceEntry[]): StrengthProgressItem[] {
  const usableEntries = entries.filter((entry) => entry.weight && entry.reps > 0);
  const source = usableEntries;
  const grouped = source.reduce<Record<string, ExercisePerformanceEntry[]>>((acc, entry) => {
    const lift = normalizeLiftName(entry.exerciseName);
    if (!["Bench Press", "Squat", "Deadlift", "Overhead Press", "Row", "Pull-up / Pulldown"].includes(lift)) return acc;
    acc[lift] = [...(acc[lift] ?? []), entry];
    return acc;
  }, {});

  return ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Row", "Pull-up / Pulldown"]
    .map((lift) => {
      const liftEntries = (grouped[lift] ?? []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (!liftEntries.length) return null;

      const previous = liftEntries[0];
      const current = liftEntries[liftEntries.length - 1];
      const previousMax = estimateOneRepMax(previous.weight ?? 0, previous.reps);
      const currentMax = estimateOneRepMax(current.weight ?? 0, current.reps);
      const best = Math.max(...liftEntries.map((entry) => estimateOneRepMax(entry.weight ?? 0, entry.reps)));

      return {
        lift,
        currentEstimatedOneRepMax: Math.round(currentMax),
        previousEstimatedOneRepMax: Math.round(previousMax),
        percentChange: percentChange(currentMax, previousMax),
        isPr: currentMax >= best,
        isDemo: source.some((entry) => entry.isDemo)
      };
    })
    .filter(Boolean) as StrengthProgressItem[];
}

function targetsForExercise(entry: ExercisePerformanceEntry): MuscleGroupName[] {
  const name = entry.exerciseName.toLowerCase();
  const group = entry.muscleGroup?.toLowerCase() ?? "";

  if (name.includes("curl")) return ["Biceps"];
  if (name.includes("triceps") || name.includes("pressdown") || name.includes("pushdown")) return ["Triceps"];
  if (name.includes("lateral") || name.includes("shoulder") || group.includes("shoulder")) return ["Shoulders"];
  if (name.includes("bench") || name.includes("chest") || name.includes("push-up") || group.includes("chest")) return ["Chest", "Triceps"];
  if (name.includes("row") || name.includes("pulldown") || name.includes("pull-up") || group.includes("back")) return ["Back", "Biceps"];
  if (name.includes("deadlift") || name.includes("romanian") || name.includes("rdl")) return ["Hamstrings", "Glutes", "Back"];
  if (name.includes("hip thrust") || name.includes("glute bridge") || group.includes("glute")) return ["Glutes", "Hamstrings"];
  if (name.includes("squat") || name.includes("leg press") || name.includes("lunge") || name.includes("step-up") || group.includes("leg")) {
    return ["Quads", "Glutes"];
  }
  if (name.includes("calf")) return ["Calves"];
  if (name.includes("plank") || name.includes("dead bug") || name.includes("pallof") || name.includes("carry") || group.includes("core")) return ["Core"];

  return ["Core"];
}

function calculateMuscleGroupVolume(entries: ExercisePerformanceEntry[]) {
  const startOfWeek = weekStart();
  const weeklyEntries = entries.filter((entry) => isAfterOrSame(entry.date, startOfWeek));
  const setsByMuscle = targetOrder.reduce<Record<MuscleGroupName, number>>((acc, muscle) => {
    acc[muscle] = 0;
    return acc;
  }, {} as Record<MuscleGroupName, number>);

  for (const entry of weeklyEntries) {
    for (const target of targetsForExercise(entry)) {
      setsByMuscle[target] += entry.sets;
    }
  }

  return targetOrder.map((muscleGroup) => {
    const sets = setsByMuscle[muscleGroup];
    const target = muscleTargets[muscleGroup];
    const status: MuscleGroupVolume["status"] = sets < target.min ? "Low" : sets > target.max ? "High" : "On track";
    const insight =
      status === "Low"
        ? `${sets === 0 ? "No" : sets} sets - add ${Math.max(2, target.min - sets)}-${Math.max(4, target.min - sets + 2)} sets this week.`
        : status === "High"
          ? `${sets} sets - watch recovery and joint stress.`
          : `${sets} sets - inside the target range.`;

    return {
      muscleGroup,
      sets,
      targetMin: target.min,
      targetMax: target.max,
      status,
      insight
    };
  });
}

function calculateRecentWorkouts(logs: ProgressWorkoutLog[], entries: ExercisePerformanceEntry[]) {
  const entriesByWorkout = entries.reduce<Record<string, ExercisePerformanceEntry[]>>((acc, entry) => {
    const key = entry.workoutId ?? getDateKey(new Date(entry.date));
    acc[key] = [...(acc[key] ?? []), entry];
    return acc;
  }, {});

  return [...logs]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 6)
    .map((log) => {
      const dateKey = logDateKey(log);
      const workoutEntries = entriesByWorkout[log.workoutId ?? log.id] ?? entriesByWorkout[dateKey] ?? [];
      const totalSets = workoutEntries.reduce((sum, entry) => sum + entry.sets, 0);
      const totalVolume = workoutEntries.reduce((sum, entry) => sum + entry.sets * entry.reps * parseNumber(entry.weight), 0);

      return {
        id: log.id,
        date: dateKey,
        title: log.title ?? log.focus,
        totalSets,
        totalVolume,
        completedAt: log.completedAt
      };
    });
}

function imbalanceInsights(groups: MuscleGroupVolume[]) {
  const getSets = (name: MuscleGroupName) => groups.find((group) => group.muscleGroup === name)?.sets ?? 0;
  const push = getSets("Chest") + getSets("Shoulders") + getSets("Triceps");
  const pull = getSets("Back") + getSets("Biceps");
  const quads = getSets("Quads");
  const posterior = getSets("Hamstrings") + getSets("Glutes");
  const upper = push + pull;
  const lower = quads + posterior + getSets("Calves");
  const arms = getSets("Biceps") + getSets("Triceps");
  const compound = getSets("Chest") + getSets("Back") + getSets("Quads") + getSets("Hamstrings") + getSets("Glutes");
  const insights: string[] = [];

  if (push > pull * 1.35 && push >= 8) insights.push("Push volume is running higher than pull volume. Add rows or pulldowns this week.");
  if (quads > posterior * 1.4 && quads >= 8) insights.push("Quad volume is ahead of hamstrings and glutes. Add hinge or hip thrust work.");
  if (upper > lower * 1.45 && upper >= 12) insights.push("Upper-body volume is outpacing lower body. Balance the week with a lower session.");
  if (arms > compound * 0.55 && arms >= 10) insights.push("Arm isolation is high compared with compound lift volume. Keep the big lifts protected.");

  return insights.length ? insights : ["Training balance looks reasonable. Keep matching volume to recovery."];
}

function demoWorkoutLogs(): ProgressWorkoutLog[] {
  const now = Date.now();
  return [0, 1, 3, 5, 7, 10, 13, 16, 20, 24].map((daysAgo, index) => ({
    id: `demo-log-${index}`,
    completedAt: new Date(now - daysAgo * dayMs).toISOString(),
    duration: index % 3 === 0 ? 32 : 44,
    focus: index % 2 === 0 ? "Upper" : "Lower",
    energy: index % 4 === 0 ? 3 : 4,
    soreness: index % 5 === 0 ? 3 : 2,
    completedExercises: index % 3 === 0 ? 4 : 6
  }));
}

function calculatePrTrend(entries: PRHistoryEntry[]) {
  const realEntries = entries.filter((entry) => Number.isFinite(entry.oneRepMax) && entry.oneRepMax > 0);
  const grouped = realEntries.reduce<Record<string, PRHistoryEntry[]>>((acc, entry) => {
    acc[entry.lift] = [...(acc[entry.lift] ?? []), entry].sort((a, b) => {
      const dateDelta = parseLocalDateKey(a.date).getTime() - parseLocalDateKey(b.date).getTime();
      if (dateDelta !== 0) return dateDelta;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return acc;
  }, {});
  const liftChanges = Object.entries(grouped)
    .map(([lift, liftEntries]) => {
      const first = liftEntries[0];
      const latest = liftEntries[liftEntries.length - 1];
      if (!first || !latest || liftEntries.length < 2 || first.oneRepMax <= 0) {
        return { lift, percentChange: null as number | null, latest };
      }

      return {
        lift,
        percentChange: percentChange(latest.oneRepMax, first.oneRepMax),
        latest
      };
    });
  const changes = liftChanges
    .map((item) => item.percentChange)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const latest = realEntries
    .slice()
    .sort((a, b) => parseLocalDateKey(b.date).getTime() - parseLocalDateKey(a.date).getTime())[0];

  return {
    entryCount: realEntries.length,
    liftsTracked: Object.keys(grouped).length,
    averagePercentChange: changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null,
    latest
  };
}

function demoExerciseEntries(): ExercisePerformanceEntry[] {
  const now = Date.now();
  return [
    ["Bench Press", "chest", 4, 8, 162],
    ["Incline dumbbell press", "chest", 3, 10, 60],
    ["Seated cable row", "back", 4, 10, 145],
    ["Lat pulldown", "back", 4, 10, 120],
    ["Dumbbell shoulder press", "shoulders", 3, 8, 55],
    ["Lateral raise", "shoulders", 3, 14, 20],
    ["Hammer curl", "arms", 3, 12, 35],
    ["Cable triceps pressdown", "arms", 3, 12, 55],
    ["Back squat", "legs", 4, 6, 225],
    ["Dumbbell Romanian deadlift", "glutes", 4, 8, 95],
    ["Hip thrust", "glutes", 3, 10, 185],
    ["Dead bug", "core", 3, 10, 0]
  ].map(([exerciseName, muscleGroup, sets, reps, weight], index) => ({
    id: `demo-exercise-${index}`,
    date: new Date(now - (index % 5) * dayMs).toISOString(),
    exerciseName: String(exerciseName),
    muscleGroup: String(muscleGroup),
    sets: Number(sets),
    reps: Number(reps),
    weight: Number(weight),
    isDemo: true
  }));
}

export function demoProgressInputs() {
  return {
    logs: demoWorkoutLogs(),
    exercises: demoExerciseEntries(),
    weeklyTarget: 5,
    recoveryScore: 82
  };
}

export function buildProgressAnalytics({
  logs,
  exercises,
  weeklyTarget = 5,
  recoveryScore = 72,
  prEntries = []
}: {
  logs: ProgressWorkoutLog[];
  exercises: ExercisePerformanceEntry[];
  weeklyTarget?: number;
  recoveryScore?: number;
  prEntries?: PRHistoryEntry[];
}): ProgressAnalytics {
  const hasRealWorkoutData = logs.length > 0 && !logs.every((log) => log.id.startsWith("demo-"));
  const hasRealLoadData = exercises.some((entry) => entry.weight && !entry.isDemo);
  const prTrend = calculatePrTrend(prEntries);
  const hasRealPrData = prTrend.entryCount > 0;
  const workingLogs = logs;
  const workingExercises = exercises;
  const consistency = calculateConsistency(workingLogs, weeklyTarget);
  const strength = strengthProgress(workingExercises);
  const muscleGroups = calculateMuscleGroupVolume(workingExercises);
  const recentWorkouts = calculateRecentWorkouts(workingLogs, workingExercises);
  const imbalances = imbalanceInsights(muscleGroups);
  const weekExercises = workingExercises.filter((entry) => isAfterOrSame(entry.date, weekStart()));
  const weeklyVolume = weekExercises.reduce((sum, entry) => sum + entry.sets * entry.reps * parseNumber(entry.weight), 0);
  const avgStrengthChange = strength.length
    ? strength.reduce((sum, item) => sum + item.percentChange, 0) / strength.length
    : 0;
  const recoveryText =
    recoveryScore >= 80
      ? "Good readiness to train"
      : recoveryScore >= 60
        ? "Good, train normally"
        : recoveryScore >= 40
          ? "Moderate, consider reducing intensity"
          : "Low recovery, prioritize rest";
  const backVolume = muscleGroups.find((group) => group.muscleGroup === "Back")?.sets ?? 0;
  const chestVolume = muscleGroups.find((group) => group.muscleGroup === "Chest")?.sets ?? 0;
  const coachInsights = [
    `You completed ${consistency.completedThisWeek} of ${consistency.weeklyTarget} workouts this week${
      consistency.completionRate >= 80 ? ". Great consistency." : ". Keep the next session easy to start."
    }`,
    chestVolume >= 10 && chestVolume <= 20 && backVolume < 10
      ? "Your chest volume is on track, but back volume is slightly low."
      : imbalances[0],
    recoveryScore < 60
      ? "Recovery is lower than usual. Consider reducing intensity today."
      : "Recovery is good enough to keep progressing.",
    hasRealLoadData
      ? `Strength trend is ${avgStrengthChange >= 0 ? "moving up" : "slipping"} across tracked lifts.`
      : hasRealPrData
        ? `PR history is active across ${prTrend.liftsTracked} ${prTrend.liftsTracked === 1 ? "lift" : "lifts"}.`
        : "Add PRs or set loads to start a real strength trend."
  ];
  const strengthProgressText = hasRealLoadData
    ? `${avgStrengthChange >= 0 ? "+" : ""}${avgStrengthChange.toFixed(1)}%`
    : hasRealPrData && prTrend.averagePercentChange !== null
      ? `${prTrend.averagePercentChange >= 0 ? "+" : ""}${prTrend.averagePercentChange.toFixed(1)}% PR`
      : hasRealPrData
        ? `${prTrend.liftsTracked} ${prTrend.liftsTracked === 1 ? "lift" : "lifts"}`
        : "Add PR";
  const strengthSubtext = hasRealLoadData
    ? "Compared with last month"
    : hasRealPrData && prTrend.averagePercentChange !== null
      ? "Saved PR trend"
      : hasRealPrData
        ? "PR baseline logged"
        : "Add PRs to start the trend";

  return {
    overview: {
      completionRate: `${consistency.completionRate}%`,
      completionSubtext: `${consistency.completedThisWeek} of ${consistency.weeklyTarget} workouts completed this week`,
      currentStreak: `${consistency.currentStreak} ${consistency.currentStreak === 1 ? "day" : "days"}`,
      streakSubtext: consistency.currentStreak > 0 ? "Keep stacking wins" : "Start the next run today",
      weeklyVolume: weeklyVolume > 0 ? `${formatLargeNumber(weeklyVolume)} lb` : "Load pending",
      weeklyVolumeSubtext: hasRealLoadData ? "Total lifted this week" : "Add workout loads to unlock lifted volume tracking",
      strengthProgress: strengthProgressText,
      strengthSubtext,
      recoveryScore: `${recoveryScore}/100`,
      recoverySubtext: recoveryText
    },
    consistency,
    strength,
    muscleGroups,
    recentWorkouts,
    imbalanceInsights: imbalances,
    coachInsights,
    hasRealWorkoutData,
    hasRealLoadData,
    hasRealPrData
  };
}
