import { Activity, CalendarCheck2, ChevronDown, ChevronRight, Gauge, Lock, PlayCircle, RotateCcw, ShieldCheck, Sparkles, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DailyCoachMessage } from "@/components/daily-coach-message";
import { EmptyState } from "@/components/empty-state";
import { MomentumCard, WeeklyRecapCard } from "@/components/momentum-system";
import { NewUserChecklist, type ChecklistProgress } from "@/components/new-user-checklist";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/brand";
import { getLocalDateKey, getLocalDateKeyDaysAgo, getStartOfLocalWeek } from "@/lib/dates";
import { calculateMomentumSystem, type MomentumLog, type MomentumSystem } from "@/lib/momentum";
import { normalizePlanType, type PlanType } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectivePlanType, hasPremiumAccess } from "@/lib/subscription";
import type { DailyWorkoutStatus, DashboardStat, GeneratedWorkout } from "@/lib/types";

type DashboardData = {
  userId: string | null;
  stats: DashboardStat[];
  consistency: number;
  mostTrained: string[];
  insight: string;
  readinessScore: number;
  readinessTitle: string;
  nextBestAction: string;
  planType: PlanType;
  hasPremiumAccess: boolean;
  momentum: MomentumSystem;
  checklistProgress: ChecklistProgress;
  todayStatus: DailyWorkoutStatus | "none";
  todayTitle: string;
  todayFocus: string;
  goalProfile: string;
  weakPointFocus: string;
  weeklyTarget: number;
  completedThisWeek: number;
};

type DashboardDailyWorkoutRow = {
  id: string;
  workout_date: string;
  workout_json: unknown;
  input_snapshot: unknown;
  title: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function DetailSection({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.035]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/10 p-4">{children}</div>
    </details>
  );
}

function demoMomentumLogs(): MomentumLog[] {
  const now = Date.now();
  return [0, 2, 4, 7, 10, 14, 18, 22, 25].map((daysAgo, index) => ({
    completed_at: new Date(now - daysAgo * 86400000).toISOString(),
    duration: index % 3 === 0 ? 28 : 42,
    focus: index % 2 === 0 ? "Upper" : "Full body",
    energy: index % 4 === 0 ? 3 : 4,
    soreness: index % 5 === 0 ? 3 : 2
  }));
}

function formatProfileLabel(value: unknown, fallback = "Recomposition") {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isGeneratedWorkout(value: unknown): value is GeneratedWorkout {
  if (typeof value !== "object" || value === null) return false;
  const workout = value as Partial<GeneratedWorkout>;
  return typeof workout.name === "string" && typeof workout.duration === "number" && Array.isArray(workout.exercises);
}

function validDailyStatus(value: unknown): DailyWorkoutStatus | "none" {
  return value === "planned" || value === "started" || value === "completed" || value === "skipped" ? value : "none";
}

function dailyWorkoutToMomentumLog(row: DashboardDailyWorkoutRow): MomentumLog {
  const workout = isGeneratedWorkout(row.workout_json) ? row.workout_json : null;
  const input =
    typeof row.input_snapshot === "object" && row.input_snapshot !== null
      ? (row.input_snapshot as { energy?: unknown; soreness?: unknown })
      : {};

  return {
    completed_at: `${row.workout_date}T12:00:00`,
    duration: workout?.duration ?? null,
    focus: row.title ?? workout?.name ?? workout?.focus ?? "Completed workout",
    energy: typeof input.energy === "number" ? input.energy : null,
    soreness: typeof input.soreness === "number" ? input.soreness : null
  };
}

function dashboardIntensity(data: DashboardData) {
  if (data.momentum.reentryMode) return "Re-entry";
  if (data.momentum.recoveryMode || data.momentum.protectionMode) return "Light";
  if (data.readinessScore >= 78) return "Hard";
  return "Moderate";
}

function dashboardDuration(data: DashboardData) {
  if (data.momentum.protectionMode || data.momentum.reentryMode) return "20-30 min";
  if (data.readinessScore >= 78) return "35-50 min";
  return "25-40 min";
}

function dashboardWhy(data: DashboardData) {
  if (data.todayStatus === "completed") return "Workout complete. Recovery starts now.";
  if (data.todayStatus === "started") return "Finish the session, then lock it in for Progress.";
  if (data.todayStatus === "planned") return "Your plan is saved. Start with the first exercise.";
  if (data.momentum.reentryMode) return "Re-entry session to keep the system moving.";
  if (data.momentum.recoveryMode) return "Volume reduced to protect recovery.";
  if (data.momentum.protectionMode) return "Friction reduced to preserve momentum.";
  if (data.readinessScore >= 78) return "Readiness supports a useful push.";
  return "Progress maintained with a repeatable dose.";
}

function dashboardHeadline(data: DashboardData) {
  if (data.todayStatus === "completed") return "Workout complete. Recovery starts now.";
  if (data.todayStatus === "started") return "Workout in progress. Finish strong.";
  if (data.todayStatus === "planned") return "Today's mission is ready.";
  return data.readinessTitle;
}

function dashboardPrimaryAction(data: DashboardData) {
  if (data.todayStatus === "completed") return { href: "/progress", label: "View progress" };
  if (data.todayStatus === "planned" || data.todayStatus === "started") return { href: "/workout", label: "Go to Today" };
  return { href: "/workout", label: "Start today's workout" };
}

function dashboardNextStep(data: DashboardData) {
  if (data.todayStatus === "completed") return "Log recovery tonight or check your Progress signal.";
  if (data.todayStatus === "started") return "Complete the final sets and save the workout.";
  if (data.todayStatus === "planned") return "Open Today and start exercise one.";
  return "Build today's workout from a quick check-in.";
}

function dashboardSnapshotStats(data: DashboardData): DashboardStat[] {
  return [
    {
      label: "Weekly goal",
      value: `${data.completedThisWeek}/${data.weeklyTarget}`,
      detail:
        data.completedThisWeek >= data.weeklyTarget
          ? "Weekly target met"
          : `${Math.max(0, data.weeklyTarget - data.completedThisWeek)} more to hit the week`
    },
    {
      label: "Today",
      value:
        data.todayStatus === "none"
          ? "Not built"
          : data.todayStatus.charAt(0).toUpperCase() + data.todayStatus.slice(1),
      detail: dashboardNextStep(data)
    },
    {
      label: "Momentum",
      value: `${data.momentum.score}/100`,
      detail: data.momentum.state
    },
    {
      label: "Recovery",
      value: `${data.momentum.recoveryBalance}/100`,
      detail: data.momentum.recoveryMode ? "Keep volume honest" : "Ready to train"
    }
  ];
}

function buildStats(rows: { completed_at: string; energy?: number | null }[], momentum: MomentumSystem): DashboardStat[] {
  const avgEnergy =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + (row.energy ?? 3), 0) / rows.length
      : 0;

  return [
    {
      label: "Momentum score",
      value: `${momentum.score}/100`,
      detail: momentum.state
    },
    {
      label: "Completed workouts",
      value: `${rows.length}`,
      detail: "Most recent 50 logs"
    },
    {
      label: "Weekly consistency",
      value: `${momentum.adherencePercent}%`,
      detail: "Rolling 14-day adherence"
    },
    {
      label: "Recovery balance",
      value: `${momentum.recoveryBalance}/100`,
      detail: momentum.recoveryMode ? "Recovery Momentum active" : "Training recovery signal"
    },
    {
      label: "Energy trend",
      value: rows.length > 0 ? `${avgEnergy.toFixed(1)}/5` : "Needs check-ins",
      detail: "Gets smarter with more check-ins"
    }
  ];
}

async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) {
    const demoLogs = demoMomentumLogs();
    const momentum = calculateMomentumSystem(demoLogs, { weeklyTarget: 4, preferredWorkoutLength: 35 });
    return {
      userId: null,
      stats: buildStats(demoLogs, momentum).slice(0, 4),
      consistency: 86,
      mostTrained: ["Upper", "Full body", "Core"],
      insight: momentum.explanation,
      readinessScore: 82,
      readinessTitle: "Momentum is intact. Keep the next session repeatable.",
      nextBestAction: momentum.recommendation,
      planType: "Free",
      hasPremiumAccess: false,
      momentum,
      checklistProgress: {},
      todayStatus: "planned",
      todayTitle: "Adaptive lift",
      todayFocus: "Upper body",
      goalProfile: "Recomposition",
      weakPointFocus: "V-taper",
      weeklyTarget: 4,
      completedThisWeek: 3
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      stats: buildStats([], calculateMomentumSystem([], { weeklyTarget: 4, preferredWorkoutLength: 35 })).slice(0, 4),
      consistency: 0,
      mostTrained: [],
      insight: "Log workouts to unlock personalized consistency insights.",
      readinessScore: 58,
      readinessTitle: "Start with a small, clean win",
      nextBestAction: `Save your first adaptive workout so ${APP_NAME} can learn your rhythm.`,
      planType: "Free",
      hasPremiumAccess: false,
      momentum: calculateMomentumSystem([], { weeklyTarget: 4, preferredWorkoutLength: 35 }),
      checklistProgress: {},
      todayStatus: "none",
      todayTitle: "Build today's workout",
      todayFocus: "Adaptive lift",
      goalProfile: "Recomposition",
      weakPointFocus: "Set in onboarding",
      weeklyTarget: 4,
      completedThisWeek: 0
    };
  }

  const [{ data: logs }, { data: profile }, { data: fitnessProfile }, { data: completedDailyRows }, { data: todayWorkoutRow }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("completed_at, duration, focus, energy, soreness")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("plan_type, weekly_training_days, preferred_workout_length, primary_goal, weak_points")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_fitness_profiles")
      .select("onboarding_completed, checklist_progress")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_workouts")
      .select("id, workout_date, workout_json, input_snapshot, title, status, updated_at, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("workout_date", getLocalDateKeyDaysAgo(28))
      .order("workout_date", { ascending: false })
      .limit(50),
    supabase
      .from("daily_workouts")
      .select("id, workout_date, workout_json, input_snapshot, title, status, updated_at, created_at")
      .eq("user_id", user.id)
      .eq("workout_date", getLocalDateKey())
      .maybeSingle()
  ]);

  const legacyRows = (logs ?? []) as {
    completed_at: string;
    duration: number | null;
    focus: string | null;
    energy: number | null;
    soreness: number | null;
  }[];
  const completedDaily = ((completedDailyRows ?? []) as DashboardDailyWorkoutRow[]).filter((row) => row.workout_date);
  const dailyDates = new Set(completedDaily.map((row) => row.workout_date));
  const dailyRows = completedDaily.map(dailyWorkoutToMomentumLog);
  const rows = [
    ...dailyRows,
    ...legacyRows.filter((row) => {
      const dateKey = row.completed_at?.slice(0, 10);
      return !dateKey || !dailyDates.has(dateKey);
    })
  ];
  const profileRow = (profile ?? {}) as {
    plan_type?: unknown;
    weekly_training_days?: unknown;
    preferred_workout_length?: unknown;
    primary_goal?: unknown;
    weak_points?: unknown;
  };
  const fitnessProfileRow = (fitnessProfile ?? {}) as { onboarding_completed?: unknown; checklist_progress?: unknown };
  const checklistProgress = {
    ...((fitnessProfileRow.checklist_progress ?? {}) as ChecklistProgress),
    completedProfile:
      ((fitnessProfileRow.checklist_progress ?? {}) as ChecklistProgress).completedProfile ||
      fitnessProfileRow.onboarding_completed === true
  };
  const planType = normalizePlanType(profileRow.plan_type);
  const premiumAccess = hasPremiumAccess(planType);
  const weeklyTarget = typeof profileRow.weekly_training_days === "number" ? profileRow.weekly_training_days : 4;
  const preferredLength = typeof profileRow.preferred_workout_length === "number" ? profileRow.preferred_workout_length : 35;
  const momentum = calculateMomentumSystem(rows, { weeklyTarget, preferredWorkoutLength: preferredLength });
  const startOfWeek = getStartOfLocalWeek();
  const weekRows = rows.filter((row) => new Date(row.completed_at).getTime() >= startOfWeek.getTime());
  const consistency = Math.min(100, Math.round((weekRows.length / weeklyTarget) * 100));
  const focusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const focus = row.focus ?? "Full body";
    acc[focus] = (acc[focus] ?? 0) + 1;
    return acc;
  }, {});
  const mostTrained = Object.entries(focusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([focus]) => focus);
  const avgEnergy =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + (row.energy ?? 3), 0) / rows.length
      : 0;
  const todayRow = (todayWorkoutRow ?? null) as DashboardDailyWorkoutRow | null;
  const todayWorkout = isGeneratedWorkout(todayRow?.workout_json) ? todayRow.workout_json : null;
  const weakPoints = asStringList(profileRow.weak_points);
  const todayStatus = validDailyStatus(todayRow?.status);

  return {
    userId: user.id,
    stats: buildStats(rows, momentum).slice(0, 4),
    consistency,
    mostTrained,
    insight:
      rows.length > 0
        ? momentum.explanation
        : "Generate and save your first workout to start seeing your consistency story.",
    readinessScore: Math.max(45, Math.min(94, Math.round(momentum.score * 0.72 + avgEnergy * 6))),
    readinessTitle:
      momentum.protectionMode
        ? "Momentum Protection Mode is the right move"
        : rows.length > 0 && avgEnergy >= 3.5
          ? "Ready for a useful push"
          : "Keep the dose manageable today",
    nextBestAction:
      rows.length > 0
        ? momentum.recommendation
        : "Run a 20-30 minute starter workout and save it as completed.",
    planType: getEffectivePlanType(planType),
    hasPremiumAccess: premiumAccess,
    momentum,
    checklistProgress,
    todayStatus,
    todayTitle: todayRow?.title ?? todayWorkout?.name ?? "Build today's workout",
    todayFocus: todayWorkout?.focus ? formatProfileLabel(todayWorkout.focus, "Adaptive lift") : "Adaptive lift",
    goalProfile: formatProfileLabel(profileRow.primary_goal),
    weakPointFocus: weakPoints[0] ? formatProfileLabel(weakPoints[0], "Weak point") : "Set in onboarding",
    weeklyTarget,
    completedThisWeek: weekRows.length
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const icons = [Activity, CalendarCheck2, RotateCcw, ShieldCheck];
  const hasFormCoachAccess = data.hasPremiumAccess;
  const primaryAction = dashboardPrimaryAction(data);
  const snapshotStats = dashboardSnapshotStats(data);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Welcome back"
        copy={data.todayStatus === "completed" ? "Workout complete. Recovery starts now." : "Your next workout is ready when you are."}
      >
        <Button asChild>
          <a href={primaryAction.href}>{primaryAction.label}</a>
        </Button>
      </PageHeader>

      <section className="mt-6">
        <Card
          data-tour="dashboard-overview"
          className="overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.075] via-white/[0.04] to-accent/10"
        >
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {data.momentum.state}
                  </Badge>
                  <Badge>{data.momentum.score}/100 momentum</Badge>
                </div>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold text-white">{dashboardHeadline(data)}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{dashboardWhy(data)}</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <a href={primaryAction.href}>
                      <PlayCircle className="h-4 w-4" />
                      {primaryAction.label}
                    </a>
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground">{data.completedThisWeek} of {data.weeklyTarget} workouts complete this week.</span>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Today&apos;s mission</p>
                <h3 className="mt-3 text-xl font-semibold leading-tight text-white">{data.todayTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{dashboardNextStep(data)}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    ["Status", data.todayStatus === "none" ? "Not built" : data.todayStatus.charAt(0).toUpperCase() + data.todayStatus.slice(1)],
                    ["Built for", data.goalProfile],
                    ["Focus", data.todayFocus],
                    ["Dose", `${dashboardIntensity(data)} · ${dashboardDuration(data)}`]
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
                      <p className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshotStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            {...stat}
            icon={icons[index]}
            accent={index % 2 === 0 ? "green" : "blue"}
          />
        ))}
      </section>

      <section className="mt-6">
        <NewUserChecklist initialProgress={data.checklistProgress} userId={data.userId} />
      </section>

      <div className="mt-6">
        <DailyCoachMessage />
      </div>

      <section className="mt-6 grid gap-3">
        <DetailSection title="Why did the plan change?" icon={Sparkles}>
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold">Coach read</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">This keeps your momentum alive.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{data.insight}</p>
                <Button asChild className="mt-5 w-full justify-between">
                  <a href="/workout">
                    Adapt today&apos;s workout
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
            <MomentumCard momentum={data.momentum} />
          </div>
        </DetailSection>

        <DetailSection title="Weekly recap" icon={RotateCcw}>
          <WeeklyRecapCard recap={data.momentum.weeklyRecap} />
        </DetailSection>

        <DetailSection title="Progress details" icon={Activity}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.stats.map((stat, index) => (
              <StatCard
                key={stat.label}
                {...stat}
                icon={icons[index]}
                accent={index % 2 === 0 ? "green" : "blue"}
              />
            ))}
          </div>
        </DetailSection>

        <DetailSection title="Training patterns" icon={Gauge}>
          <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-white">Most trained muscle groups</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A useful signal for balancing future sessions.
                </p>
                {data.mostTrained.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {data.mostTrained.map((focus, index) => (
                      <div key={focus} className="flex items-center gap-3 rounded-2xl bg-white/[0.045] p-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{focus}</p>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${92 - index * 22}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptyState
                      icon={Activity}
                      title="No muscle group data yet"
                      copy={`Save a completed workout and ${APP_NAME} will start building your training profile.`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-white">This week&apos;s operating system</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Must do", "2 sessions", "Protect these even if they become 20-minute workouts."],
                    ["Flexible", "1-2 sessions", "Use the adaptive builder when schedule or soreness changes."],
                    ["Recovery", "Daily check", "Do not make up missed workouts with punishment volume."]
                  ].map(([label, value, copy]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">Short session. Still counts.</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    On rough days, {APP_NAME} trims volume and keeps the habit alive. That is still training.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </DetailSection>

        <DetailSection title="More tools" icon={Video}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.04] to-accent/10">
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Video className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-primary">Form feedback</p>
                    {!hasFormCoachAccess ? (
                      <Badge className="border-primary/25 bg-primary/10 text-primary">
                        <Lock className="mr-1 h-3 w-3" />
                        Pro
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">AI Form Coach</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {hasFormCoachAccess
                      ? "Upload a short lifting video and get safety-first cues before your next set."
                      : "Upgrade to Pro to upload lifting videos, get form feedback, and build form check history."}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <a href={hasFormCoachAccess ? "/form-coach" : "/pricing"}>
                  {hasFormCoachAccess ? "Open Form Coach" : "Upgrade to Pro"}
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </DetailSection>
      </section>
    </>
  );
}
