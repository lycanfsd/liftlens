import { Activity, CalendarCheck2, ChevronDown, ChevronRight, Gauge, Lock, PlayCircle, RotateCcw, ShieldCheck, Sparkles, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DailyCoachMessage } from "@/components/daily-coach-message";
import { EmptyState } from "@/components/empty-state";
import { MomentumCard, WeeklyRecapCard } from "@/components/momentum-system";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateMomentumSystem, type MomentumLog, type MomentumSystem } from "@/lib/momentum";
import { normalizePlanType, type PlanType } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectivePlanType, hasPremiumAccess } from "@/lib/subscription";
import type { DashboardStat } from "@/lib/types";

type DashboardData = {
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
  if (data.momentum.reentryMode) return "Re-entry session to keep the system moving.";
  if (data.momentum.recoveryMode) return "Volume reduced to protect recovery.";
  if (data.momentum.protectionMode) return "Friction reduced to preserve momentum.";
  if (data.readinessScore >= 78) return "Readiness supports a useful push.";
  return "Progress maintained with a repeatable dose.";
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
      value: rows.length > 0 ? `${avgEnergy.toFixed(1)}/5` : "Pending",
      detail: "Gets smarter with more check-ins"
    }
  ];
}

async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) {
    const demoLogs = demoMomentumLogs();
    const momentum = calculateMomentumSystem(demoLogs, { weeklyTarget: 4, preferredWorkoutLength: 35 });
    return {
      stats: buildStats(demoLogs, momentum).slice(0, 4),
      consistency: 86,
      mostTrained: ["Upper", "Full body", "Core"],
      insight: momentum.explanation,
      readinessScore: 82,
      readinessTitle: "Momentum is intact. Keep the next session repeatable.",
      nextBestAction: momentum.recommendation,
      planType: "Free",
      hasPremiumAccess: false,
      momentum
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      stats: buildStats([], calculateMomentumSystem([], { weeklyTarget: 4, preferredWorkoutLength: 35 })).slice(0, 4),
      consistency: 0,
      mostTrained: [],
      insight: "Log workouts to unlock personalized consistency insights.",
      readinessScore: 58,
      readinessTitle: "Start with a small, clean win",
      nextBestAction: "Save your first adaptive workout so FlexFit can learn your rhythm.",
      planType: "Free",
      hasPremiumAccess: false,
      momentum: calculateMomentumSystem([], { weeklyTarget: 4, preferredWorkoutLength: 35 })
    };
  }

  const [{ data: logs }, { data: profile }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("completed_at, duration, focus, energy, soreness")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("plan_type, weekly_training_days, preferred_workout_length").eq("user_id", user.id).maybeSingle()
  ]);

  const rows = (logs ?? []) as {
    completed_at: string;
    duration: number | null;
    focus: string | null;
    energy: number | null;
    soreness: number | null;
  }[];
  const profileRow = (profile ?? {}) as { plan_type?: unknown; weekly_training_days?: unknown; preferred_workout_length?: unknown };
  const planType = normalizePlanType(profileRow.plan_type);
  const premiumAccess = hasPremiumAccess(planType);
  const weeklyTarget = typeof profileRow.weekly_training_days === "number" ? profileRow.weekly_training_days : 4;
  const preferredLength = typeof profileRow.preferred_workout_length === "number" ? profileRow.preferred_workout_length : 35;
  const momentum = calculateMomentumSystem(rows, { weeklyTarget, preferredWorkoutLength: preferredLength });
  const now = Date.now();
  const weekRows = rows.filter((row) => now - new Date(row.completed_at).getTime() <= 7 * 86400000);
  const consistency = Math.min(100, Math.round((weekRows.length / 4) * 100));
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

  return {
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
    momentum
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const icons = [Activity, CalendarCheck2, RotateCcw, ShieldCheck];
  const hasFormCoachAccess = data.hasPremiumAccess;

  return (
    <>
      <PageHeader
        eyebrow="Daily operating brief"
        title="Today, keep the system moving."
        copy="A calm plan for the day you actually have. Details are there when you want them."
      >
        <Button asChild>
          <a href="/workout">Start workout</a>
        </Button>
      </PageHeader>

      <section className="mt-6">
        <Card
          data-tour="dashboard-overview"
          className="overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.075] via-white/[0.04] to-accent/10"
        >
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {data.momentum.state}
                  </Badge>
                  <Badge>{data.momentum.score}/100 momentum</Badge>
                </div>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold text-white">{data.readinessTitle}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{dashboardWhy(data)}</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <a href="/workout">
                      <PlayCircle className="h-4 w-4" />
                      Start workout
                    </a>
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground">You do not need a perfect day to make progress.</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Do today</p>
                  <p className="mt-2 font-semibold text-white">Adaptive lift</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Time</p>
                  <p className="mt-2 font-semibold text-white">{dashboardDuration(data)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Intensity</p>
                  <p className="mt-2 font-semibold text-white">{dashboardIntensity(data)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Focus</p>
                  <p className="mt-2 font-semibold text-white">Momentum</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                      copy="Save a completed workout and LiftLens will start building your training profile."
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
                    On rough days, LiftLens trims volume and keeps the habit alive. That is still training.
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
