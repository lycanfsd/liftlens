"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  LineChart,
  Minus,
  Moon,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  markChecklistItemAction,
  savePhysiqueMeasurementAction,
  savePrHistoryEntryAction,
  saveRecoveryLogAction
} from "@/app/app-actions";
import { StatCard, statCardTextStyles } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/brand";
import { getLocalDateKey, parseLocalDateKey } from "@/lib/dates";
import type { PhysiqueMeasurementEntry } from "@/lib/progress/physique-metrics";
import { metricChange, physiqueMetricLabels } from "@/lib/progress/physique-metrics";
import {
  formatPRDate,
  getAllTimePRForLift,
  getEntriesForLift,
  getLatestPRForLift,
  getPRChangeForLift,
  getPRHistory,
  getPRPercentChangeForLift,
  getPRStorageKey,
  mainPRLifts,
  mergePRHistoryEntry,
  savePRHistoryEntry,
  type PRHistoryEntry,
  type PRLift
} from "@/lib/progress/pr-history";
import type { ProgressAnalytics } from "@/lib/progress/progress-analytics";
import type { RecoveryLogEntry } from "@/lib/progress/recovery-metrics";
import { calculateRecoveryScore, recoveryInterpretation } from "@/lib/progress/recovery-metrics";
import { cn } from "@/lib/utils";

// Keep old FlexFit local keys as read-only fallbacks so local progress logs survive the Ulvori rebrand.
const legacyPhysiqueStorageKey = "flexfit-physique-measurements";
const legacyRecoveryStorageKey = "flexfit-recovery-logs";
const physiqueStorageKey = "ulvori-physique-measurements";
const recoveryStorageKey = "ulvori-recovery-logs";
const SHOW_PROGRESS_PHOTOS = false;
const polishedCardHover = "transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white/[0.055]";
const insetPanel = "rounded-2xl border border-white/10 bg-white/[0.035]";

type PhysiqueFormState = Record<keyof Omit<PhysiqueMeasurementEntry, "id" | "date">, string> & {
  date: string;
};

type RecoveryFormState = {
  date: string;
  sleepHours: string;
  energy: string;
  soreness: string;
  stress: string;
  workoutRpe: string;
};

type PRFormState = {
  lift: PRLift;
  date: string;
  oneRepMax: string;
  notes: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== "" ? parsed : null;
}

function loadLocalArray<T>(key: string, legacyKey?: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key) ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveLocalArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function sortByDateDesc<T extends { date: string }>(entries: T[]) {
  return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mergeDatedEntry<T extends { id: string; date: string }>(entries: T[], entry: T) {
  const existingIndex = entries.findIndex((current) => current.date === entry.date);
  const next =
    existingIndex >= 0
      ? entries.map((current, index) => (index === existingIndex ? { ...entry, id: current.id } : current))
      : [entry, ...entries];
  return sortByDateDesc(next).slice(0, 100);
}

function formatChange(change: number | null, unit: string) {
  if (change === null) return "First entry";
  if (change === 0) return "No change";
  return `${change > 0 ? "+" : ""}${change.toFixed(1)} ${unit}`;
}

function formatCompletedTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatProfileLabel(value: string | null | undefined) {
  if (!value) return "Recomposition";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ProgressSection({
  id,
  title,
  copy,
  children,
  action,
  tourId
}: {
  id?: string;
  title: string;
  copy?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  tourId?: string;
}) {
  return (
    <section id={id} data-tour={tourId} className="space-y-5 scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl gap-3">
          <span className="mt-1 h-9 w-1 rounded-full bg-primary/70 shadow-[0_0_20px_rgba(74,222,128,0.25)]" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
            {copy ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MiniBar({ value, max = 100, tone = "green" }: { value: number; max?: number; tone?: "green" | "blue" | "amber" }) {
  const width = `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  const color = tone === "blue" ? "bg-accent" : tone === "amber" ? "bg-amber-300" : "bg-primary";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10 shadow-inner shadow-black/20">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width }} />
    </div>
  );
}

function SourceBadge({ real }: { real: boolean }) {
  return (
    <Badge className={real ? "border-primary/25 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.04] text-muted-foreground"}>
      {real ? "Real data" : "Demo adapter"}
    </Badge>
  );
}

function ProgressTrajectoryCard({
  analytics,
  recoveryScore,
  profileGoal,
  weakPoints = []
}: {
  analytics: ProgressAnalytics;
  recoveryScore: number;
  profileGoal?: string | null;
  weakPoints?: string[];
}) {
  const completion = analytics.consistency.completionRate;
  const nextMove =
    recoveryScore < 60
      ? "Keep intensity controlled until recovery rebounds."
      : completion < 70
        ? "Protect the next session with a low-friction plan."
        : "Use this week to push strength or weak points forward.";

  return (
    <Card
      data-tour="progress-analytics"
      className="min-w-0 overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))]"
    >
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            This week
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Progress without noise.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with the signals that move your physique: consistency, strength, recovery, and balanced volume. Details sit lower on the page.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Completion", `${completion}%`, completion >= 80 ? "On pace" : "Needs one win"],
            ["Recovery", `${recoveryScore}/100`, recoveryInterpretation(recoveryScore)],
            [
              "Profile bias",
              formatProfileLabel(profileGoal),
              weakPoints.length ? `Weak point: ${formatProfileLabel(weakPoints[0])}` : "Set in onboarding"
            ]
          ].map(([label, value, copy]) => (
            <div key={label} className={cn(insetPanel, "min-w-0 p-4 sm:p-5")}>
              <p className={statCardTextStyles.label}>{label}</p>
              <p className={cn(statCardTextStyles.value, "text-[clamp(1.35rem,2vw,1.75rem)]")}>{value}</p>
              <p className={cn(statCardTextStyles.detail, "mt-1 text-xs leading-5")}>{copy}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-primary/15 bg-black/25 p-4 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-primary">Next best move:</span> {nextMove}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewCards({ analytics, recoveryScore }: { analytics: ProgressAnalytics; recoveryScore: number }) {
  const recoveryText = recoveryInterpretation(recoveryScore);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Workout completion rate"
        value={analytics.overview.completionRate}
        detail={analytics.overview.completionSubtext}
        icon={CheckCircle2}
        accent="green"
      />
      <StatCard
        label="Current streak"
        value={analytics.overview.currentStreak}
        detail={analytics.overview.streakSubtext}
        icon={Flame}
        accent="blue"
      />
      <StatCard
        label="Lifted volume"
        value={analytics.overview.weeklyVolume}
        detail={analytics.overview.weeklyVolumeSubtext}
        icon={Dumbbell}
        accent="silver"
      />
      <StatCard
        label="Strength progress"
        value={analytics.overview.strengthProgress}
        detail={analytics.overview.strengthSubtext}
        icon={Trophy}
        accent="green"
      />
      <StatCard
        label="Recovery score"
        value={`${recoveryScore}/100`}
        detail={recoveryText}
        icon={ShieldCheck}
        accent="blue"
      />
    </section>
  );
}

function ConsistencyAnalytics({ analytics }: { analytics: ProgressAnalytics }) {
  const consistency = analytics.consistency;
  const recent = analytics.recentWorkouts;

  return (
    <ProgressSection title="Consistency" copy="Consistency matters more than perfection. This view keeps the week honest without guilt.">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["This week", `${consistency.completedThisWeek}`, "Workouts completed"],
                ["This month", `${consistency.completedThisMonth}`, "Completed sessions"],
                ["Current streak", `${consistency.currentStreak} days`, "Keep stacking wins"],
                ["Best streak", `${consistency.bestStreak} days`, "Best run so far"],
                ["Missed", `${consistency.missedThisWeek}`, "This week"],
                ["Completion", `${consistency.completionRate}%`, "Weekly rate"]
              ].map(([label, value, copy]) => (
                <div key={label} className={cn(insetPanel, "p-4 transition hover:border-primary/20 hover:bg-white/[0.05]")}>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">This week</h3>
                <p className="mt-1 text-sm text-muted-foreground">Completed vs missed workout days.</p>
              </div>
              <SourceBadge real={analytics.hasRealWorkoutData} />
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {consistency.weekDays.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "min-h-24 rounded-2xl border p-3 text-center transition hover:border-primary/20 hover:bg-white/[0.05]",
                    day.completed
                      ? "border-primary/30 bg-primary/12 text-primary"
                      : "border-white/10 bg-white/[0.035] text-muted-foreground",
                    day.isToday && "ring-1 ring-accent/50"
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase">{day.label}</p>
                  <div className="mt-3 grid place-items-center">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border",
                        day.completed ? "border-primary/30 bg-primary/15" : "border-white/10 bg-black/20"
                      )}
                    >
                      {day.completed ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/30" />}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <MiniBar value={consistency.completionRate} />
              <p className="mt-2 text-xs text-muted-foreground">
                {consistency.completedThisWeek} of {consistency.weeklyTarget} target workouts completed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className={polishedCardHover}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-white">Recent completed workouts</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pulled from the same completed Today workouts that power your history.</p>
            </div>
            <SourceBadge real={analytics.hasRealWorkoutData} />
          </div>

          {recent.length ? (
            <div className="mt-4 grid gap-2">
              {recent.map((workout) => (
                <div
                  key={workout.id}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm transition hover:border-primary/20 hover:bg-white/[0.05] sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{workout.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Completed {formatCompletedTime(workout.completedAt)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {workout.totalSets} sets
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {workout.totalVolume > 0 ? `${workout.totalVolume.toLocaleString()} lb` : "Volume pending"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-5">
              <p className="font-semibold text-white">Complete your first workout to unlock progress analytics.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Once you finish a Today workout, it will appear here with sets, focus, and muscle group volume.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </ProgressSection>
  );
}

function formatPRValue(entry: PRHistoryEntry | null, unit: "lb" | "kg") {
  return entry ? `${entry.oneRepMax.toLocaleString()} ${unit}` : "No PR";
}

function formatPRDelta(change: number | null, percent: number | null, unit: "lb" | "kg") {
  if (change === null || percent === null) return "No trend yet";
  if (change === 0) return "Unchanged";
  return `${change > 0 ? "+" : ""}${change.toLocaleString()} ${unit} (${percent > 0 ? "+" : ""}${percent.toFixed(1)}%)`;
}

function isLatestAllTimePR(latest: PRHistoryEntry | null, allTime: PRHistoryEntry | null) {
  return Boolean(latest && allTime && latest.id === allTime.id && latest.oneRepMax === allTime.oneRepMax);
}

function getStrengthPRInsight(lift: string, entries: PRHistoryEntry[], unit: "lb" | "kg") {
  const change = getPRChangeForLift(entries, lift, unit);
  const percent = getPRPercentChangeForLift(entries, lift, unit);

  if (!entries.length) {
    return `Add your current ${lift} one-rep max to set a baseline. Strength trends are one of the cleanest signals that your training is supporting muscle growth.`;
  }

  if (entries.length === 1) {
    return `${lift} baseline logged at ${entries[0].oneRepMax} ${unit}. Add another entry later to see your trend.`;
  }

  if (change && change > 0) {
    return `Your ${lift} is up ${change} ${unit} since the last entry${percent ? ` (${percent.toFixed(1)}%)` : ""}. Strong progress.`;
  }

  if (change === 0) {
    return `Your ${lift} is holding steady. Add reps or small weight jumps over time.`;
  }

  return `Your ${lift} is below the last entry. That can reflect fatigue, recovery, or a conservative estimate. Keep the next update honest.`;
}

function prOverviewFromEntries(entries: PRHistoryEntry[]) {
  const grouped = entries.reduce<Record<string, PRHistoryEntry[]>>((acc, entry) => {
    acc[entry.lift] = [...(acc[entry.lift] ?? []), entry].sort((a, b) => {
      const dateDelta = parseLocalDateKey(a.date).getTime() - parseLocalDateKey(b.date).getTime();
      if (dateDelta !== 0) return dateDelta;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return acc;
  }, {});
  const changes = Object.values(grouped)
    .map((liftEntries) => {
      const first = liftEntries[0];
      const latest = liftEntries[liftEntries.length - 1];
      if (!first || !latest || liftEntries.length < 2 || first.oneRepMax <= 0) return null;
      return ((latest.oneRepMax - first.oneRepMax) / first.oneRepMax) * 100;
    })
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const liftsTracked = Object.keys(grouped).length;
  const averageChange = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null;

  return {
    liftsTracked,
    strengthProgress:
      averageChange !== null
        ? `${averageChange >= 0 ? "+" : ""}${averageChange.toFixed(1)}% PR`
        : `${liftsTracked} ${liftsTracked === 1 ? "lift" : "lifts"}`,
    strengthSubtext: averageChange !== null ? "Saved PR trend" : "PR baseline logged"
  };
}

function withClientPrOverview(analytics: ProgressAnalytics, entries: PRHistoryEntry[]): ProgressAnalytics {
  if (entries.length === 0 || analytics.hasRealLoadData) return analytics;

  const prOverview = prOverviewFromEntries(entries);
  return {
    ...analytics,
    hasRealPrData: true,
    overview: {
      ...analytics.overview,
      strengthProgress: prOverview.strengthProgress,
      strengthSubtext: prOverview.strengthSubtext
    },
    coachInsights: [
      ...analytics.coachInsights.slice(0, 3),
      `PR history is active across ${prOverview.liftsTracked} ${prOverview.liftsTracked === 1 ? "lift" : "lifts"}.`
    ]
  };
}

function PRTrendIcon({ change }: { change: number | null }) {
  if (change === null || change === 0) return <Minus className="h-4 w-4" />;
  if (change > 0) return <ArrowUpRight className="h-4 w-4" />;
  return <ArrowDownRight className="h-4 w-4" />;
}

function StrengthPRCard({
  lift,
  entries,
  selected,
  unit,
  onSelect
}: {
  lift: PRLift;
  entries: PRHistoryEntry[];
  selected: boolean;
  unit: "lb" | "kg";
  onSelect: (lift: PRLift) => void;
}) {
  const latest = getLatestPRForLift(entries, lift, unit);
  const allTime = getAllTimePRForLift(entries, lift, unit);
  const change = getPRChangeForLift(entries, lift, unit);
  const percent = getPRPercentChangeForLift(entries, lift, unit);
  const newPr = isLatestAllTimePR(latest, allTime);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(lift)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/[0.055]",
        selected
          ? "border-primary/45 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.15),transparent_45%),rgba(74,222,128,0.07)] ring-1 ring-primary/35 shadow-[0_0_34px_rgba(74,222,128,0.10)]"
          : "border-white/10 bg-white/[0.035]"
      )}
    >
      {selected ? <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{lift}</p>
            {selected ? <Badge className="border-primary/20 bg-primary/10 text-primary">Selected</Badge> : null}
            {newPr ? <Badge className="border-primary/25 bg-primary/15 text-primary">New PR</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{latest ? `Updated ${formatPRDate(latest.date)}` : "No PR logged yet"}</p>
        </div>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition group-hover:scale-105",
            change && change > 0
              ? "border-primary/25 bg-primary/10 text-primary"
              : change && change < 0
                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-black/20 text-muted-foreground"
          )}
          aria-hidden="true"
        >
          <PRTrendIcon change={change} />
        </span>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Current 1RM</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatPRValue(latest, unit)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">All-time</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatPRValue(allTime, unit)}</p>
          </div>
        </div>
      </div>
      <p className={cn("mt-4 text-sm font-semibold", change && change > 0 ? "text-primary" : "text-muted-foreground")}>
        {formatPRDelta(change, percent, unit)}
      </p>
    </button>
  );
}

function PRTrendChart({ entries, lift, unit }: { entries: PRHistoryEntry[]; lift: string; unit: "lb" | "kg" }) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  useEffect(() => {
    setActivePointIndex(null);
  }, [lift]);

  if (!entries.length) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LineChart className="h-6 w-6" />
          </span>
          <h4 className="mt-4 font-semibold text-white">Start tracking your strength</h4>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add your first PR to start tracking strength.
          </p>
        </div>
      </div>
    );
  }

  const width = 680;
  const height = 270;
  const padding = { top: 24, right: 22, bottom: 42, left: 52 };
  const values = entries.map((entry) => entry.oneRepMax);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(1, maxValue - minValue);
  const chartMin = Math.max(0, Math.floor(minValue - spread * 0.14));
  const chartMax = Math.ceil(maxValue + spread * 0.14);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const points = entries.map((entry, index) => {
    const x =
      entries.length === 1
        ? padding.left + innerWidth / 2
        : padding.left + (index / (entries.length - 1)) * innerWidth;
    const y = padding.top + (1 - (entry.oneRepMax - chartMin) / Math.max(1, chartMax - chartMin)) * innerHeight;
    return { x, y, entry };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const activePoint = activePointIndex !== null ? points[activePointIndex] ?? null : null;
  const areaPath =
    points.length > 1
      ? `M ${points[0].x} ${height - padding.bottom} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${
          points[points.length - 1].x
        } ${height - padding.bottom} Z`
      : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">{lift} trend</h3>
          <p className="mt-1 text-sm text-muted-foreground">One-rep max history over time.</p>
        </div>
        <Badge className="w-fit border-primary/20 bg-primary/10 text-primary">{entries.length} entries</Badge>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="relative h-64 min-w-[540px] sm:h-72 sm:min-w-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${lift} one-rep max trend`}
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id={`pr-gradient-${lift.replace(/\W+/g, "-").toLowerCase()}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(74 222 128)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(74 222 128)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => {
            const y = padding.top + (line / 3) * innerHeight;
            return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />;
          })}
          <text x={padding.left - 10} y={padding.top + 4} textAnchor="end" className="fill-white/45 text-[11px]">
            {chartMax} {unit}
          </text>
          <text x={padding.left - 10} y={height - padding.bottom + 4} textAnchor="end" className="fill-white/45 text-[11px]">
            {chartMin} {unit}
          </text>
          {areaPath ? <path d={areaPath} fill={`url(#pr-gradient-${lift.replace(/\W+/g, "-").toLowerCase()})`} /> : null}
          {points.length > 1 ? <polyline fill="none" points={linePoints} stroke="rgb(74 222 128)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" /> : null}
          {points.map((point, index) => (
            <g
              key={`${point.entry.date}-${point.entry.oneRepMax}`}
              role="button"
              tabIndex={0}
              aria-label={`${lift} ${formatPRDate(point.entry.date)} ${point.entry.oneRepMax} ${unit}`}
              className="cursor-pointer outline-none"
              onBlur={() => setActivePointIndex(null)}
              onClick={() => setActivePointIndex(index)}
              onFocus={() => setActivePointIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActivePointIndex(index);
                }
              }}
              onMouseEnter={() => setActivePointIndex(index)}
              onMouseLeave={() => setActivePointIndex(null)}
            >
              <circle cx={point.x} cy={point.y} r="18" fill="transparent" />
              <circle cx={point.x} cy={point.y} r="7" fill="rgb(74 222 128)" opacity="0.24" />
              <circle
                cx={point.x}
                cy={point.y}
                r={activePointIndex === index ? "6" : "4"}
                fill="rgb(74 222 128)"
                stroke={activePointIndex === index ? "rgba(255,255,255,0.9)" : "transparent"}
                strokeWidth="2"
              />
            </g>
          ))}
          <text x={padding.left} y={height - 14} textAnchor="start" className="fill-white/45 text-[11px]">
            {formatPRDate(entries[0].date)}
          </text>
          <text x={width - padding.right} y={height - 14} textAnchor="end" className="fill-white/45 text-[11px]">
            {formatPRDate(entries[entries.length - 1].date)}
          </text>
        </svg>
        {activePoint ? (
          <div
            className="pointer-events-none absolute z-10 min-w-44 max-w-60 rounded-2xl border border-primary/30 bg-black/90 p-3 text-left shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
              transform: `translate(${
                activePoint.x > width * 0.72 ? "-92%" : activePoint.x < width * 0.28 ? "-8%" : "-50%"
              }, ${activePoint.y < height * 0.34 ? "18px" : "-115%"})`
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{lift}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatPRDate(activePoint.entry.date)}</p>
            <p className="mt-2 text-lg font-semibold text-white">
              1RM: {activePoint.entry.oneRepMax} {activePoint.entry.unit}
            </p>
            {activePoint.entry.notes ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Note: {activePoint.entry.notes}</p> : null}
          </div>
        ) : null}
        </div>
      </div>
      {entries.length === 1 ? (
        <p className="mt-3 text-sm text-muted-foreground">Add another entry later to see your trend line.</p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground sm:hidden">Swipe sideways to inspect the full trend.</p>
    </div>
  );
}

function StrengthProgressAnalytics({
  analytics,
  userId,
  initialEntries = [],
  onEntriesChange
}: {
  analytics: ProgressAnalytics;
  userId?: string | null;
  initialEntries?: PRHistoryEntry[];
  onEntriesChange?: (entries: PRHistoryEntry[]) => void;
}) {
  const unit = "lb";
  const storageKey = useMemo(() => getPRStorageKey(userId), [userId]);
  const accountSyncEnabled = Boolean(userId);
  const [entries, setEntries] = useState<PRHistoryEntry[]>(() => (accountSyncEnabled ? initialEntries : []));
  const [selectedLift, setSelectedLift] = useState<PRLift>(mainPRLifts[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingPr, startPrTransition] = useTransition();
  const [form, setForm] = useState<PRFormState>({
    lift: mainPRLifts[0],
    date: getLocalDateKey(),
    oneRepMax: "",
    notes: ""
  });
  const selectedEntries = useMemo(() => getEntriesForLift(entries, selectedLift, unit), [entries, selectedLift]);
  const latest = getLatestPRForLift(entries, selectedLift, unit);
  const allTime = getAllTimePRForLift(entries, selectedLift, unit);
  const selectedChange = getPRChangeForLift(entries, selectedLift, unit);
  const selectedPercent = getPRPercentChangeForLift(entries, selectedLift, unit);
  const selectedNewPr = isLatestAllTimePR(latest, allTime);
  const hasAnyPrs = entries.length > 0;

  useEffect(() => {
    const loaded = accountSyncEnabled ? initialEntries : getPRHistory(storageKey);
    setEntries(loaded);
  }, [accountSyncEnabled, initialEntries, storageKey]);

  useEffect(() => {
    onEntriesChange?.(entries);
  }, [entries, onEntriesChange]);

  function selectLift(lift: PRLift) {
    setSelectedLift(lift);
    setForm((current) => ({ ...current, lift }));
    setError("");
    setMessage("");
  }

  function updateField<K extends keyof PRFormState>(key: K, value: PRFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function savePr() {
    const oneRepMax = Number(form.oneRepMax);

    if (!form.lift) {
      setError("Choose a lift to track.");
      setMessage("");
      return;
    }

    if (!form.date) {
      setError("Choose a date for this PR.");
      setMessage("");
      return;
    }

    if (!Number.isFinite(oneRepMax) || oneRepMax <= 0) {
      setError("Enter a positive one-rep max.");
      setMessage("");
      return;
    }

    const entry: PRHistoryEntry = {
      id: createId("pr"),
      lift: form.lift,
      date: form.date,
      oneRepMax: Math.round(oneRepMax * 10) / 10,
      unit,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    if (!accountSyncEnabled) {
      const next = savePRHistoryEntry(storageKey, entry);
      setEntries(next);
      setSelectedLift(form.lift);
      setError("");
      setMessage(`${form.lift} PR saved on this device.`);
      setForm((current) => ({ ...current, oneRepMax: "", notes: "" }));
      return;
    }

    startPrTransition(async () => {
      const result = await savePrHistoryEntryAction(entry);

      if (!result.ok || !result.entry) {
        setError(result.message);
        setMessage("");
        return;
      }

      setEntries((current) => {
        const next = mergePRHistoryEntry(current, result.entry as PRHistoryEntry);
        return next;
      });
      setSelectedLift(result.entry.lift as PRLift);
      setError("");
      setMessage(result.message);
      setForm((current) => ({ ...current, oneRepMax: "", notes: "" }));
    });
  }

  return (
    <ProgressSection
      id="strength-prs"
      tourId="strength-pr-tracker"
      title="Strength PRs"
      copy="Track your one-rep maxes and watch your strength trend upward."
      action={
        <div className="flex flex-wrap gap-2">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            {accountSyncEnabled ? "Account-synced PRs" : "Local PR log"}
          </Badge>
          <SourceBadge real={analytics.hasRealPrData} />
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Add PR entry</h3>
                <p className="mt-1 text-sm text-muted-foreground">Quick update. Same lift/date replaces the old point.</p>
              </div>
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.25fr_0.9fr]">
              <div className="grid gap-2 xl:col-span-2">
                <Label htmlFor="pr-lift">Lift</Label>
                <select
                  id="pr-lift"
                  value={form.lift}
                  onChange={(event) => updateField("lift", event.target.value as PRLift)}
                  className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                >
                  {mainPRLifts.map((lift) => (
                    <option key={lift} value={lift} className="bg-background text-white">
                      {lift}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pr-date">Date</Label>
                <Input id="pr-date" type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pr-max">1RM</Label>
                <Input
                  id="pr-max"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder={`e.g. 185 ${unit}`}
                  value={form.oneRepMax}
                  onChange={(event) => updateField("oneRepMax", event.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="pr-notes">Notes</Label>
                <Input
                  id="pr-notes"
                  placeholder="Felt strong, smooth rep"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" className="w-full sm:w-auto" onClick={savePr} disabled={isSavingPr}>
              <Plus className="h-4 w-4" />
              {isSavingPr ? "Saving..." : "Save PR"}
            </Button>
              {message ? <p className="text-sm text-primary">{message}</p> : null}
              {error ? <p className="text-sm text-amber-100">{error}</p> : null}
            </div>

            {!hasAnyPrs ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-5">
                <p className="font-semibold text-white">Start tracking your strength</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Add your first PR to start tracking strength.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/25 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.16),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] transition hover:border-primary/35">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">{selectedLift}</h3>
                  {selectedNewPr ? <Badge className="border-primary/25 bg-primary/15 text-primary">New PR</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Selected lift performance snapshot.</p>
              </div>
              <Badge className="w-fit border-primary/20 bg-primary/10 text-primary">Goal signal</Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Current", formatPRValue(latest, unit)],
                ["All-time PR", formatPRValue(allTime, unit)],
                ["Last change", formatPRDelta(selectedChange, selectedPercent, unit)]
              ].map(([label, value]) => (
                <div key={label} className={cn(insetPanel, "p-4 transition hover:border-primary/20 hover:bg-white/[0.05]")}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-primary/15 bg-black/25 p-4 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-primary">Coach read:</span> {getStrengthPRInsight(selectedLift, selectedEntries, unit)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mainPRLifts.map((lift) => (
          <StrengthPRCard
            key={lift}
            lift={lift}
            entries={entries}
            selected={selectedLift === lift}
            unit={unit}
            onSelect={selectLift}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <PRTrendChart entries={selectedEntries} lift={selectedLift} unit={unit} />
          </CardContent>
        </Card>

        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Recent entries</h3>
                <p className="mt-1 text-sm text-muted-foreground">History for {selectedLift}.</p>
              </div>
              <Badge className="border-white/10 bg-white/[0.04] text-muted-foreground">{unit}</Badge>
            </div>
            {selectedEntries.length ? (
              <div className="mt-5 space-y-3">
                {selectedEntries
                  .slice(-6)
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className={cn(insetPanel, "p-4")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {entry.oneRepMax} {entry.unit}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatPRDate(entry.date)}</p>
                        </div>
                        {entry.id === latest?.id && selectedNewPr ? (
                          <Badge className="border-primary/20 bg-primary/10 text-primary">New PR</Badge>
                        ) : entry === allTime ? (
                          <Badge className="border-white/10 bg-white/[0.04] text-muted-foreground">All-time</Badge>
                        ) : null}
                      </div>
                      {entry.notes ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.notes}</p> : null}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
                <p className="font-semibold text-white">No PR logged yet.</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Save a {selectedLift} entry to start the history.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProgressSection>
  );
}

function MuscleGroupVolumeAnalytics({ analytics }: { analytics: ProgressAnalytics }) {
  const maxTarget = Math.max(...analytics.muscleGroups.map((group) => group.targetMax));

  if (!analytics.hasRealWorkoutData) {
    return (
      <ProgressSection title="Muscle Group Balance" copy="Weekly hard sets will appear here once completed workouts start syncing.">
        <Card className={polishedCardHover}>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-lg font-semibold text-white">Complete your first workout to unlock volume trends.</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {APP_NAME} will count hard sets by muscle group and show whether your physique work is balanced.
              </p>
              <Button asChild className="mt-5 w-full sm:w-auto">
                <a href="/workout">Build today&apos;s workout</a>
              </Button>
            </div>
            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Dumbbell className="h-7 w-7" />
            </span>
          </CardContent>
        </Card>
      </ProgressSection>
    );
  }

  return (
    <ProgressSection title="Muscle Group Balance" copy="Weekly hard sets by muscle group, compared with useful physique-building target ranges.">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className={polishedCardHover}>
          <CardContent className="space-y-3 p-5">
            {analytics.muscleGroups.map((group) => {
              const tone = group.status === "High" ? "amber" : group.status === "Low" ? "blue" : "green";

              return (
                <div key={group.muscleGroup} className={cn(insetPanel, "p-4 transition hover:border-primary/20 hover:bg-white/[0.05]")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{group.muscleGroup}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target: {group.targetMin}-{group.targetMax} sets/week
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        group.status === "On track" && "border-primary/25 bg-primary/10 text-primary",
                        group.status === "Low" && "border-accent/25 bg-accent/10 text-accent",
                        group.status === "High" && "border-amber-300/20 bg-amber-300/10 text-amber-100"
                      )}
                    >
                      {group.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <MiniBar value={group.sets} max={maxTarget} tone={tone} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{group.insight}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-semibold">Balance checks</span>
            </div>
            <div className="mt-5 space-y-3">
              {analytics.imbalanceInsights.map((insight) => (
                <div key={insight} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-muted-foreground transition hover:border-primary/20">
                  {insight}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProgressSection>
  );
}

function PhysiqueTracker({
  onEntriesChange,
  initialEntries = [],
  userId
}: {
  onEntriesChange: (entries: PhysiqueMeasurementEntry[]) => void;
  initialEntries?: PhysiqueMeasurementEntry[];
  userId?: string | null;
}) {
  const [entries, setEntries] = useState<PhysiqueMeasurementEntry[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingPhysique, startPhysiqueTransition] = useTransition();
  const accountSyncEnabled = Boolean(userId);
  const [form, setForm] = useState<PhysiqueFormState>({
    date: getLocalDateKey(),
    weight: "",
    waist: "",
    chest: "",
    shoulders: "",
    arms: "",
    thighs: "",
    hipsGlutes: "",
    bodyFat: ""
  });

  useEffect(() => {
    const loaded = accountSyncEnabled ? initialEntries : loadLocalArray<PhysiqueMeasurementEntry>(physiqueStorageKey, legacyPhysiqueStorageKey);
    setEntries(loaded);
    onEntriesChange(loaded);
  }, [accountSyncEnabled, initialEntries, onEntriesChange]);

  function updateField(key: keyof PhysiqueFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveEntry() {
    const entry: PhysiqueMeasurementEntry = {
      id: createId("physique"),
      date: form.date || getLocalDateKey(),
      weight: safeNumber(form.weight),
      waist: safeNumber(form.waist),
      chest: safeNumber(form.chest),
      shoulders: safeNumber(form.shoulders),
      arms: safeNumber(form.arms),
      thighs: safeNumber(form.thighs),
      hipsGlutes: safeNumber(form.hipsGlutes),
      bodyFat: safeNumber(form.bodyFat)
    };
    if (!accountSyncEnabled) {
      const next = mergeDatedEntry(entries, entry);
      setEntries(next);
      onEntriesChange(next);
      saveLocalArray(physiqueStorageKey, next);
      setMessage("Physique metrics saved on this device.");
      setError("");
      return;
    }

    startPhysiqueTransition(async () => {
      const result = await savePhysiqueMeasurementAction(entry);

      if (!result.ok || !result.entry) {
        setError(result.message);
        setMessage("");
        return;
      }

      const next = mergeDatedEntry(entries, result.entry);
      setEntries(next);
      onEntriesChange(next);
      setMessage(result.message);
      setError("");
    });
  }

  return (
    <ProgressSection title="Physique Tracker" copy="Log slow-moving physique markers and watch the trend, not the noise. Signed-in entries stay with your account.">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Add measurement</h3>
                <p className="mt-1 text-sm text-muted-foreground">Small updates, clean trendline later.</p>
              </div>
              <Badge className="border-white/10 bg-white/[0.04] text-muted-foreground">
                {accountSyncEnabled ? "Account synced" : "Local log"}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="physique-date">Date</Label>
                <Input id="physique-date" type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
              </div>
              {physiqueMetricLabels.map((metric) => (
                <div key={metric.key} className="grid gap-2">
                  <Label htmlFor={`physique-${metric.key}`}>{metric.label}</Label>
                  <Input
                    id={`physique-${metric.key}`}
                    type="number"
                    step="0.1"
                    placeholder={metric.unit}
                    value={form[metric.key] ?? ""}
                    onChange={(event) => updateField(metric.key, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <Button type="button" className="mt-5 w-full sm:w-auto" onClick={saveEntry} disabled={isSavingPhysique}>
              <Plus className="h-4 w-4" />
              {isSavingPhysique ? "Saving..." : "Save measurement"}
            </Button>
            {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-amber-100">{error}</p> : null}
          </CardContent>
        </Card>

        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Latest measurement</h3>
                <p className="mt-1 text-sm text-muted-foreground">Changes are compared with your previous entry.</p>
              </div>
            </div>
            {entries.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {physiqueMetricLabels.map((metric) => {
                  const data = metricChange(entries, metric.key);
                  if (!data) return null;

                  return (
                    <div key={metric.key} className={cn(insetPanel, "p-4 transition hover:border-primary/20 hover:bg-white/[0.05]")}>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {data.latest.toFixed(1)} {metric.unit}
                      </p>
                      <p className={cn("mt-1 text-sm", data.change && data.change > 0 ? "text-primary" : "text-muted-foreground")}>
                        {formatChange(data.change, metric.unit)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5">
                <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Scale className="h-6 w-6" />
                  </span>
                  <h4 className="mt-4 font-semibold text-white">No physique entries yet</h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Log your first measurement to track your physique changes.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProgressSection>
  );
}

function ProgressPhotos() {
  return (
    <ProgressSection title="Progress Photos" copy="Future front, side, and back photo comparisons will live here.">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Front", "Add front photo"],
          ["Side", "Add side photo"],
          ["Back", "Add back photo"]
        ].map(([label, action]) => (
          <Card key={label} className={polishedCardHover}>
            <CardContent className="p-5">
              <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] transition hover:border-primary/20">
                <div className="text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Camera className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-semibold text-white">{label}</p>
                  <p className="mt-2 px-4 text-sm leading-6 text-muted-foreground">Progress photo tracking coming soon.</p>
                </div>
              </div>
              <Button type="button" variant="outline" className="mt-4 w-full">
                {action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </ProgressSection>
  );
}

function RecoveryReadiness({
  onScoreChange,
  initialEntries = [],
  userId
}: {
  onScoreChange: (score: number) => void;
  initialEntries?: RecoveryLogEntry[];
  userId?: string | null;
}) {
  const [entries, setEntries] = useState<RecoveryLogEntry[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingRecovery, startRecoveryTransition] = useTransition();
  const accountSyncEnabled = Boolean(userId);
  const [form, setForm] = useState<RecoveryFormState>({
    date: getLocalDateKey(),
    sleepHours: "7",
    energy: "7",
    soreness: "3",
    stress: "4",
    workoutRpe: "7"
  });

  useEffect(() => {
    const loaded = accountSyncEnabled ? initialEntries : loadLocalArray<RecoveryLogEntry>(recoveryStorageKey, legacyRecoveryStorageKey);
    setEntries(loaded);
    if (loaded[0]) onScoreChange(loaded[0].score);
  }, [accountSyncEnabled, initialEntries, onScoreChange]);

  const previewScore = calculateRecoveryScore({
    sleepHours: Number(form.sleepHours) || 0,
    energy: Number(form.energy) || 0,
    soreness: Number(form.soreness) || 0,
    stress: Number(form.stress) || 0,
    workoutRpe: Number(form.workoutRpe) || 0
  });

  function updateField(key: keyof RecoveryFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveEntry() {
    const entry: RecoveryLogEntry = {
      id: createId("recovery"),
      date: form.date || getLocalDateKey(),
      sleepHours: Number(form.sleepHours) || 0,
      energy: Number(form.energy) || 0,
      soreness: Number(form.soreness) || 0,
      stress: Number(form.stress) || 0,
      workoutRpe: Number(form.workoutRpe) || 0,
      score: previewScore
    };
    if (!accountSyncEnabled) {
      const next = mergeDatedEntry(entries, entry);
      setEntries(next);
      saveLocalArray(recoveryStorageKey, next);
      onScoreChange(entry.score);
      setMessage("Recovery log saved on this device.");
      setError("");
      return;
    }

    startRecoveryTransition(async () => {
      const result = await saveRecoveryLogAction(entry);

      if (!result.ok || !result.entry) {
        setError(result.message);
        setMessage("");
        return;
      }

      const next = mergeDatedEntry(entries, result.entry);
      setEntries(next);
      onScoreChange(result.entry.score);
      setMessage(result.message);
      setError("");
    });
  }

  return (
    <ProgressSection
      tourId="recovery-readiness"
      title="Recovery & Readiness"
      copy="Track the inputs that decide whether to push, maintain, or reduce intensity."
    >
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.04] to-accent/10 transition hover:border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Moon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Recovery score</p>
                <p className="text-3xl font-semibold text-white">{previewScore}/100</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{recoveryInterpretation(previewScore)}</p>
            <div className="mt-4">
              <MiniBar value={previewScore} />
            </div>
          </CardContent>
        </Card>

        <Card className={polishedCardHover}>
          <CardContent className="p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Log readiness</h3>
                <p className="mt-1 text-sm text-muted-foreground">Use simple signals to keep training dose honest.</p>
              </div>
              <Badge className="border-white/10 bg-white/[0.04] text-muted-foreground">
                {accountSyncEnabled ? "Account synced" : "Local log"}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="recovery-date">Date</Label>
                <Input id="recovery-date" type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
              </div>
              {[
                ["sleepHours", "Sleep hours", "0.1", "hours"],
                ["energy", "Energy", "1", "1-10"],
                ["soreness", "Soreness", "1", "1-10"],
                ["stress", "Stress", "1", "1-10"],
                ["workoutRpe", "Workout difficulty/RPE", "1", "1-10"]
              ].map(([key, label, step, placeholder]) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={`recovery-${key}`}>{label}</Label>
                  <Input
                    id={`recovery-${key}`}
                    type="number"
                    step={step}
                    min={key === "sleepHours" ? 0 : 1}
                    max={key === "sleepHours" ? 14 : 10}
                    placeholder={placeholder}
                    value={form[key as keyof RecoveryFormState]}
                    onChange={(event) => updateField(key as keyof RecoveryFormState, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <Button type="button" className="mt-5 w-full sm:w-auto" onClick={saveEntry} disabled={isSavingRecovery}>
              {isSavingRecovery ? "Saving..." : "Save recovery log"}
            </Button>
            {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-amber-100">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </ProgressSection>
  );
}

function AICoachInsights({
  analytics,
  physiqueEntries,
  recoveryScore
}: {
  analytics: ProgressAnalytics;
  physiqueEntries: PhysiqueMeasurementEntry[];
  recoveryScore: number;
}) {
  const physiqueInsight = useMemo(() => {
    const waist = metricChange(physiqueEntries, "waist");
    const weight = metricChange(physiqueEntries, "weight");

    if (waist?.change !== null && waist?.change !== undefined && waist.change < 0) {
      return "Waist is trending down. If strength holds steady, that is a strong recomposition signal.";
    }
    if (weight?.change !== null && weight?.change !== undefined && weight.change > 0) {
      return "Body weight is moving up. Watch waist and performance together to confirm quality gain.";
    }
    return "Log a few physique measurements to unlock trend-based physique insights.";
  }, [physiqueEntries]);
  const recoveryInsight =
    recoveryScore < 60
      ? "Recovery is lower than usual. Consider reducing intensity today."
      : "Recovery is good enough to keep the plan moving.";
  const insights = [physiqueInsight, recoveryInsight, ...analytics.coachInsights].filter(Boolean).slice(0, 6);

  return (
    <ProgressSection title="AI Coach Insights" copy="Rule-based for now, structured so future AI summaries can replace this layer.">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.04] to-accent/10 transition hover:border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold">Coach read</span>
          </div>
          <div className="mt-5 grid gap-3">
            {insights.map((insight, index) => (
              <div key={insight} className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-muted-foreground transition hover:border-primary/20">
                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-[10px] font-semibold text-primary">
                  {index + 1}
                </span>
                {insight}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ProgressSection>
  );
}

export function ProgressAnalyticsCenter({
  analytics,
  userId,
  initialPrEntries = [],
  initialPhysiqueEntries = [],
  initialRecoveryEntries = [],
  profileGoal,
  weakPoints = []
}: {
  analytics: ProgressAnalytics;
  userId?: string | null;
  initialPrEntries?: PRHistoryEntry[];
  initialPhysiqueEntries?: PhysiqueMeasurementEntry[];
  initialRecoveryEntries?: RecoveryLogEntry[];
  profileGoal?: string | null;
  weakPoints?: string[];
}) {
  const latestRecoveryScore = initialRecoveryEntries[0]?.score;
  const initialRecoveryScore = latestRecoveryScore ?? (Number.parseInt(analytics.overview.recoveryScore, 10) || 72);
  const [recoveryScore, setRecoveryScore] = useState(initialRecoveryScore);
  const [physiqueEntries, setPhysiqueEntries] = useState<PhysiqueMeasurementEntry[]>([]);
  const [prEntries, setPrEntries] = useState<PRHistoryEntry[]>(initialPrEntries);
  const handlePrEntriesChange = useCallback((nextEntries: PRHistoryEntry[]) => {
    setPrEntries(nextEntries);
  }, []);
  const analyticsForDisplay = useMemo(() => withClientPrOverview(analytics, prEntries), [analytics, prEntries]);

  useEffect(() => {
    setPhysiqueEntries(userId ? initialPhysiqueEntries : loadLocalArray<PhysiqueMeasurementEntry>(physiqueStorageKey, legacyPhysiqueStorageKey));
  }, [initialPhysiqueEntries, userId]);

  useEffect(() => {
    if (!userId) return;
    void markChecklistItemAction("visitedProgress");
  }, [userId]);

  return (
    <div className="space-y-10 sm:space-y-12">
      <ProgressTrajectoryCard analytics={analyticsForDisplay} recoveryScore={recoveryScore} profileGoal={profileGoal} weakPoints={weakPoints} />
      {!analyticsForDisplay.hasRealWorkoutData || (!analyticsForDisplay.hasRealLoadData && !analyticsForDisplay.hasRealPrData) ? (
        <Card className="border-white/10 bg-white/[0.035]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {analyticsForDisplay.hasRealWorkoutData ? "Strength tracking is still pending." : "Complete your first workout to unlock analytics."}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {analyticsForDisplay.hasRealWorkoutData
                  ? "Consistency and muscle balance now use real completed workouts. Add PRs or workout loads to unlock strength trends."
                  : "Progress will stay honest until you have completed workout history. No fake completion data is shown."}
              </p>
            </div>
            <Badge className="w-fit border-primary/20 bg-primary/10 text-primary">
              {analyticsForDisplay.hasRealWorkoutData ? "Real workout data" : "Waiting for first session"}
            </Badge>
          </CardContent>
        </Card>
      ) : null}
      <OverviewCards analytics={analyticsForDisplay} recoveryScore={recoveryScore} />
      <ConsistencyAnalytics analytics={analyticsForDisplay} />
      <StrengthProgressAnalytics analytics={analyticsForDisplay} userId={userId} initialEntries={initialPrEntries} onEntriesChange={handlePrEntriesChange} />
      <MuscleGroupVolumeAnalytics analytics={analyticsForDisplay} />
      <PhysiqueTracker onEntriesChange={setPhysiqueEntries} initialEntries={initialPhysiqueEntries} userId={userId} />
      {SHOW_PROGRESS_PHOTOS ? <ProgressPhotos /> : null}
      <RecoveryReadiness onScoreChange={setRecoveryScore} initialEntries={initialRecoveryEntries} userId={userId} />
      <AICoachInsights analytics={analyticsForDisplay} physiqueEntries={physiqueEntries} recoveryScore={recoveryScore} />
    </div>
  );
}
