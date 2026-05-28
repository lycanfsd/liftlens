import { getLocalDateKey } from "@/lib/dates";
import { clamp } from "@/lib/utils";

export type MomentumState =
  | "Building"
  | "Stable"
  | "High Momentum"
  | "Recovery Momentum"
  | "Re-entry Mode"
  | "Momentum At Risk";

export type MomentumTrend = "up" | "steady" | "down";

export type MomentumLog = {
  completed_at: string;
  duration?: number | null;
  energy?: number | null;
  soreness?: number | null;
  focus?: string | null;
};

export type MomentumSignal = {
  label: string;
  value: string;
  tone: "positive" | "neutral" | "caution" | "accent";
};

export type MomentumWeekPoint = {
  label: string;
  score: number;
  sessions: number;
};

export type WeeklyRecap = {
  title: string;
  summary: string;
  strongestWeek: string;
  comebackMoment: string;
  adherenceInsight: string;
  recoveryTrend: string;
  bullets: string[];
};

export type MomentumSystem = {
  score: number;
  state: MomentumState;
  trend: MomentumTrend;
  trendLabel: string;
  adherencePercent: number;
  completionRate: number;
  consistencyScore: number;
  recoveryBalance: number;
  comebackScore: number;
  sessionQuality: number;
  protectionMode: boolean;
  recoveryMode: boolean;
  reentryMode: boolean;
  burnoutRisk: boolean;
  motivationDrop: boolean;
  adherenceDecline: boolean;
  recoveryOverload: boolean;
  daysSinceLastWorkout: number | null;
  explanation: string;
  recommendation: string;
  weeklyRecap: WeeklyRecap;
  graph: MomentumWeekPoint[];
  signals: MomentumSignal[];
};

type MomentumOptions = {
  weeklyTarget?: number | null;
  preferredWorkoutLength?: number | null;
  now?: Date;
};

const dayMs = 86400000;
const weekMs = dayMs * 7;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / dayMs));
}

function parseLogDate(log: MomentumLog) {
  const date = new Date(log.completed_at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueTrainingDays(logs: MomentumLog[]) {
  return new Set(
    logs
      .map((log) => {
        const date = parseLogDate(log);
        return date ? getLocalDateKey(date) : null;
      })
      .filter((value): value is string => Boolean(value))
  );
}

function logsWithin(logs: MomentumLog[], now: Date, windowMs: number, offsetMs = 0) {
  const end = now.getTime() - offsetMs;
  const start = end - windowMs;
  return logs.filter((log) => {
    const time = parseLogDate(log)?.getTime();
    return typeof time === "number" && time >= start && time <= end;
  });
}

function weekLabel(indexFromOldest: number, total: number) {
  const distance = total - indexFromOldest - 1;
  if (distance === 0) return "This week";
  if (distance === 1) return "Last week";
  return `${distance}w ago`;
}

function weeklyGraph(logs: MomentumLog[], now: Date, weeklyTarget: number): MomentumWeekPoint[] {
  const total = 6;
  return Array.from({ length: total }, (_, index) => {
    const distance = total - index - 1;
    const weekLogs = logsWithin(logs, now, weekMs, distance * weekMs);
    const adherence = clamp(weekLogs.length / weeklyTarget, 0, 1.15);
    const avgEnergy = average(weekLogs.map((log) => log.energy ?? 3)) ?? 3;
    const avgSoreness = average(weekLogs.map((log) => log.soreness ?? 2)) ?? 2;
    const recovery = clamp((avgEnergy / 5) * 58 + ((6 - avgSoreness) / 5) * 42, 0, 100);
    const score = Math.round(clamp(adherence * 72 + recovery * 0.28, 0, 100));

    return {
      label: weekLabel(index, total),
      score,
      sessions: weekLogs.length
    };
  });
}

function longestGapBeforeComeback(logs: MomentumLog[], now: Date) {
  const sorted = logs
    .map(parseLogDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  let longestGap = 0;
  let comebackInLastTwoWeeks = false;

  for (let index = 1; index < sorted.length; index += 1) {
    const gap = daysBetween(sorted[index], sorted[index - 1]);
    if (gap > longestGap) longestGap = gap;
    if (gap >= 3 && now.getTime() - sorted[index].getTime() <= 14 * dayMs) {
      comebackInLastTwoWeeks = true;
    }
  }

  return { longestGap, comebackInLastTwoWeeks };
}

function strongestWeek(graph: MomentumWeekPoint[]) {
  const best = graph.reduce((winner, point) => (point.score > winner.score ? point : winner), graph[0]);
  if (!best || best.sessions === 0) return "Not enough training data yet.";
  return `${best.label}: ${best.sessions} sessions with a ${best.score}/100 momentum signal.`;
}

export function calculateMomentumSystem(logs: MomentumLog[], options: MomentumOptions = {}): MomentumSystem {
  const now = options.now ?? new Date();
  const weeklyTarget = clamp(options.weeklyTarget ?? 4, 1, 7);
  const preferredLength = options.preferredWorkoutLength ?? 35;
  const sorted = [...logs].sort((a, b) => (parseLogDate(b)?.getTime() ?? 0) - (parseLogDate(a)?.getTime() ?? 0));
  const lastWorkoutDate = parseLogDate(sorted[0] ?? { completed_at: "" });
  const daysSinceLastWorkout = lastWorkoutDate ? daysBetween(now, lastWorkoutDate) : null;

  const last7 = logsWithin(sorted, now, weekMs);
  const prev7 = logsWithin(sorted, now, weekMs, weekMs);
  const last14 = logsWithin(sorted, now, weekMs * 2);
  const last28 = logsWithin(sorted, now, weekMs * 4);
  const trainingDays28 = uniqueTrainingDays(last28);
  const expected28 = weeklyTarget * 4;
  const expected14 = weeklyTarget * 2;

  const adherencePercent = Math.round(clamp((last14.length / expected14) * 100, 0, 125));
  const consistencyScore = Math.round(clamp((trainingDays28.size / expected28) * 100, 0, 100));
  const completionRate = logs.length > 0 ? Math.round(clamp((last28.length / Math.max(1, expected28)) * 100, 0, 100)) : 0;

  const avgEnergy = average(last14.map((log) => log.energy ?? 3)) ?? 3;
  const avgSoreness = average(last14.map((log) => log.soreness ?? 2)) ?? 2;
  const avgDuration = average(last14.map((log) => log.duration ?? preferredLength)) ?? preferredLength;
  const recoveryBalance = Math.round(clamp((avgEnergy / 5) * 55 + ((6 - avgSoreness) / 5) * 45, 0, 100));
  const sessionQuality = Math.round(
    clamp((avgEnergy / 5) * 45 + ((6 - avgSoreness) / 5) * 35 + clamp(avgDuration / preferredLength, 0.4, 1.2) * 20, 0, 100)
  );

  const { longestGap, comebackInLastTwoWeeks } = longestGapBeforeComeback(sorted, now);
  const comebackScore =
    comebackInLastTwoWeeks || (daysSinceLastWorkout !== null && daysSinceLastWorkout <= 2 && longestGap >= 3)
      ? 96
      : daysSinceLastWorkout === null
        ? 50
        : daysSinceLastWorkout <= 3
          ? 82
          : daysSinceLastWorkout <= 7
            ? 58
            : 30;

  const currentPace = last7.length / weeklyTarget;
  const previousPace = prev7.length / weeklyTarget;
  const momentumDelta = currentPace - previousPace;
  const trend: MomentumTrend = momentumDelta > 0.2 ? "up" : momentumDelta < -0.25 ? "down" : "steady";
  const trendScore = trend === "up" ? 90 : trend === "steady" ? 74 : 48;
  const inactivityPenalty =
    daysSinceLastWorkout === null
      ? 8
      : daysSinceLastWorkout <= 3
        ? 0
        : daysSinceLastWorkout <= 7
          ? 9
          : daysSinceLastWorkout <= 14
            ? 22
            : 34;

  const rawScore =
    adherencePercent * 0.28 +
    completionRate * 0.12 +
    consistencyScore * 0.18 +
    recoveryBalance * 0.14 +
    comebackScore * 0.12 +
    sessionQuality * 0.1 +
    trendScore * 0.06 -
    inactivityPenalty;

  const score = Math.round(clamp(logs.length === 0 ? 44 : rawScore, 0, 100));
  const adherenceDecline = trend === "down" && last7.length < prev7.length;
  const motivationDrop = daysSinceLastWorkout !== null && daysSinceLastWorkout >= 5;
  const recoveryOverload = avgSoreness >= 3.8 || (avgEnergy <= 2.4 && last7.length >= weeklyTarget);
  const burnoutRisk = recoveryOverload && adherencePercent >= 75;
  const reentryMode = daysSinceLastWorkout !== null && daysSinceLastWorkout >= 7;
  const recoveryMode = recoveryOverload || burnoutRisk;
  const protectionMode = score < 55 || adherenceDecline || motivationDrop || reentryMode || recoveryMode;

  let state: MomentumState = "Stable";
  if (logs.length === 0) state = "Building";
  else if (reentryMode) state = "Re-entry Mode";
  else if (score < 50 || adherenceDecline) state = "Momentum At Risk";
  else if (recoveryMode) state = "Recovery Momentum";
  else if (score >= 82) state = "High Momentum";
  else if (score < 68) state = "Building";

  const trendLabel =
    trend === "up"
      ? "Trajectory rising"
      : trend === "down"
        ? "Trajectory needs protection"
        : "Trajectory maintained";

  const explanation = protectionMode
    ? reentryMode
      ? "Recent inactivity increased friction, so the next sessions should be shorter, simpler, and easy to start."
      : recoveryMode
        ? "Recovery strain is showing up, so momentum is protected by reducing fatigue before adherence drops."
        : "Adherence friction increased, so the plan should lower setup complexity and preserve consistency."
    : score >= 82
      ? "Consistency is compounding. Keep the structure steady and progress without chasing perfection."
      : "Training trajectory is intact. The goal is to keep repeatable sessions in the calendar.";

  const recommendation = protectionMode
    ? `Momentum Protection Mode: use ${Math.min(preferredLength, 30)} minute sessions, simple setup, and no punishment volume.`
    : score >= 82
      ? "Keep the rhythm. Use harder sessions only when recovery signals agree."
      : "Maintain the weekly rhythm and let recovery decide how hard to push.";

  const graph = weeklyGraph(sorted, now, weeklyTarget);
  const strongest = strongestWeek(graph);
  const comebackMoment =
    comebackInLastTwoWeeks || (daysSinceLastWorkout !== null && daysSinceLastWorkout <= 2 && longestGap >= 3)
      ? "You returned after schedule friction. Momentum restored faster than a simple count would show."
      : daysSinceLastWorkout === null
        ? "No comeback data yet. The first saved workout starts the signal."
        : "No major comeback needed this week. Rhythm stayed mostly intact.";

  const weeklyRecap: WeeklyRecap = {
    title: state === "High Momentum" ? "Momentum is compounding." : protectionMode ? "Momentum is being protected." : "Trajectory maintained.",
    summary: explanation,
    strongestWeek: strongest,
    comebackMoment,
    adherenceInsight:
      adherencePercent >= 85
        ? "Consistency is strong without needing perfect days."
        : adherencePercent >= 55
          ? "A small session now protects the week better than waiting for ideal conditions."
          : "The next goal is friction reduction: shorter sessions, fewer decisions, faster starts.",
    recoveryTrend:
      recoveryBalance >= 76
        ? "Recovery is supporting training."
        : recoveryBalance >= 55
          ? "Recovery is workable. Keep volume honest."
          : "Recovery needs protection before intensity increases.",
    bullets: [
      `${last7.length}/${weeklyTarget} sessions completed this week.`,
      trendLabel,
      recoveryMode ? "Recovery Momentum active." : protectionMode ? "Friction reduced to preserve adherence." : "Training trajectory maintained."
    ]
  };

  const signals: MomentumSignal[] = [
    {
      label: "Adherence",
      value: `${Math.min(adherencePercent, 100)}% rolling`,
      tone: adherencePercent >= 75 ? "positive" : adherencePercent >= 45 ? "neutral" : "caution"
    },
    {
      label: "Recovery balance",
      value: `${recoveryBalance}/100`,
      tone: recoveryBalance >= 72 ? "positive" : recoveryBalance >= 50 ? "neutral" : "caution"
    },
    {
      label: "Comeback behavior",
      value: comebackScore >= 90 ? "restored quickly" : comebackScore >= 70 ? "protected" : "needs re-entry",
      tone: comebackScore >= 80 ? "positive" : comebackScore >= 55 ? "neutral" : "caution"
    },
    {
      label: "Recent trend",
      value: trendLabel.toLowerCase(),
      tone: trend === "up" ? "positive" : trend === "down" ? "caution" : "accent"
    }
  ];

  return {
    score,
    state,
    trend,
    trendLabel,
    adherencePercent: Math.min(adherencePercent, 100),
    completionRate,
    consistencyScore,
    recoveryBalance,
    comebackScore,
    sessionQuality,
    protectionMode,
    recoveryMode,
    reentryMode,
    burnoutRisk,
    motivationDrop,
    adherenceDecline,
    recoveryOverload,
    daysSinceLastWorkout,
    explanation,
    recommendation,
    weeklyRecap,
    graph,
    signals
  };
}
