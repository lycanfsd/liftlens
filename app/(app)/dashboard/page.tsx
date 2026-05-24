import { Activity, CalendarCheck2, ChevronRight, Flame, Gauge, Lock, Sparkles, Trophy, Video } from "lucide-react";

import { DailyCoachMessage } from "@/components/daily-coach-message";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProgressRing } from "@/components/progress-ring";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { demoStats } from "@/lib/demo-data";
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
};

function calculateStreak(days: string[]) {
  const unique = new Set(days);
  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 30; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!unique.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) {
    return {
      stats: demoStats,
      consistency: 86,
      mostTrained: ["Upper", "Full body", "Core"],
      insight: "Your best streak comes from lowering the bar on busy days, not skipping them.",
      readinessScore: 82,
      readinessTitle: "Green light, but keep the session efficient",
      nextBestAction: "Generate a 35-minute full-body session with one packed-gym fallback ready.",
      planType: "Free",
      hasPremiumAccess: false
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      stats: demoStats,
      consistency: 0,
      mostTrained: [],
      insight: "Log workouts to unlock personalized consistency insights.",
      readinessScore: 58,
      readinessTitle: "Start with a small, clean win",
      nextBestAction: "Save your first adaptive workout so FlexFit can learn your rhythm.",
      planType: "Free",
      hasPremiumAccess: false
    };
  }

  const [{ data: logs }, { data: profile }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("completed_at, focus, energy")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("plan_type").eq("user_id", user.id).maybeSingle()
  ]);

  const rows = (logs ?? []) as { completed_at: string; focus: string | null; energy: number | null }[];
  const planType = normalizePlanType((profile as { plan_type?: unknown } | null)?.plan_type);
  const premiumAccess = hasPremiumAccess(planType);
  const days = rows.map((row) => row.completed_at.slice(0, 10));
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
    stats: [
      {
        label: "Workout streak",
        value: `${calculateStreak(days)} days`,
        detail: "Consecutive completed days"
      },
      {
        label: "Completed workouts",
        value: `${rows.length}`,
        detail: "Most recent 50 logs"
      },
      {
        label: "Weekly consistency",
        value: `${consistency}%`,
        detail: `${weekRows.length} sessions this week`
      },
      {
        label: "Energy trend",
        value: rows.length > 0 ? `${avgEnergy.toFixed(1)}/5` : "Pending",
        detail: "Gets smarter with more check-ins"
      }
    ],
    consistency,
    mostTrained,
    insight:
      rows.length > 0
        ? "You are building a pattern. Keep choosing the version of the workout that fits today."
        : "Generate and save your first workout to start seeing your consistency story.",
    readinessScore: Math.max(45, Math.min(94, Math.round(consistency * 0.65 + avgEnergy * 8))),
    readinessTitle:
      rows.length > 0 && avgEnergy >= 3.5
        ? "Ready for a useful push"
        : "Keep the dose manageable today",
    nextBestAction:
      rows.length > 0
        ? "Generate today's workout and let energy, soreness, and crowding set the volume."
        : "Run a 20-30 minute starter workout and save it as completed.",
    planType: getEffectivePlanType(planType),
    hasPremiumAccess: premiumAccess
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const icons = [Flame, Trophy, CalendarCheck2, Activity];
  const hasFormCoachAccess = data.hasPremiumAccess;

  return (
    <>
      <PageHeader
        eyebrow="Daily operating brief"
        title="Today's plan fits today's life."
        copy="A premium dashboard should not just count workouts. It should tell you what to do next, what to protect, and what is working."
      >
        <Button asChild>
          <a href="/workout">Generate workout</a>
        </Button>
      </PageHeader>

      <DailyCoachMessage />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/14 via-white/[0.055] to-accent/10">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Gauge className="h-5 w-5" />
                  <span className="text-sm font-semibold">Readiness brief</span>
                </div>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold text-white">{data.readinessTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{data.nextBestAction}</p>
              </div>
              <ProgressRing value={data.readinessScore} label="fit score" className="shrink-0" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                ["Training dose", data.readinessScore > 75 ? "Push steady" : "Trim volume"],
                ["Friction rule", "Pick the plan you can start"],
                ["Recovery guardrail", "Leave one clean rep in reserve"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-2 font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">Coaching insight</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">The product is protecting consistency.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{data.insight}</p>
            <Button asChild className="mt-5 w-full justify-between">
              <a href="/workout">
                Adapt today&apos;s workout
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            {...stat}
            icon={icons[index]}
            accent={index % 2 === 0 ? "green" : "blue"}
          />
        ))}
      </div>

      <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.04] to-accent/10">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Video className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-primary">New coaching surface</p>
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

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">Most trained muscle groups</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This should feel like a coaching signal, not a chart dumped into the app.
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
                  copy="Save a completed workout and FlexFit will start building your training profile."
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
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-semibold text-primary">Low energy does not mean no progress.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                On rough days, FlexFit trims volume and keeps the habit alive. That is still training.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
