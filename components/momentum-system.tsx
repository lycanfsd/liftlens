import { Activity, BarChart3, RotateCcw, ShieldCheck, TrendingUp } from "lucide-react";

import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MomentumSystem, WeeklyRecap } from "@/lib/momentum";
import { cn } from "@/lib/utils";

function stateTone(state: MomentumSystem["state"]) {
  if (state === "High Momentum") return "border-primary/25 bg-primary/10 text-primary";
  if (state === "Recovery Momentum" || state === "Re-entry Mode" || state === "Momentum At Risk") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }
  if (state === "Building") return "border-accent/25 bg-accent/10 text-accent";
  return "border-white/10 bg-white/[0.06] text-muted-foreground";
}

function trendCopy(momentum: MomentumSystem) {
  if (momentum.trend === "up") return "Upward trajectory";
  if (momentum.trend === "down") return "Needs protection";
  return "Trajectory maintained";
}

export function MomentumTrendGraph({ momentum }: { momentum: MomentumSystem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Momentum trajectory</h3>
          <p className="mt-1 text-xs text-muted-foreground">{trendCopy(momentum)}</p>
        </div>
        <BarChart3 className="h-4 w-4 text-accent" />
      </div>
      <div className="mt-5 flex h-28 items-end gap-2">
        {momentum.graph.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-20 w-full items-end rounded-full bg-white/[0.05] p-1">
              <div
                className={cn(
                  "w-full rounded-full transition-all",
                  point.score >= 75 ? "bg-primary" : point.score >= 50 ? "bg-accent" : "bg-amber-300"
                )}
                style={{ height: `${Math.max(12, point.score)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-white">{point.sessions}</p>
              <p className="truncate text-[10px] text-muted-foreground">{point.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MomentumModeIndicator({ momentum }: { momentum: MomentumSystem }) {
  if (!momentum.protectionMode && !momentum.recoveryMode && !momentum.reentryMode) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-sm font-semibold">Momentum protected</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Training trajectory is stable. Keep the structure repeatable.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
      <div className="flex items-center gap-2 text-amber-100">
        <RotateCcw className="h-4 w-4" />
        <span className="text-sm font-semibold">
          {momentum.reentryMode ? "Re-entry mode" : momentum.recoveryMode ? "Recovery Momentum" : "Momentum Protection Mode"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{momentum.recommendation}</p>
    </div>
  );
}

export function MomentumCard({ momentum }: { momentum: MomentumSystem }) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.045] to-accent/10">
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_150px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={stateTone(momentum.state)}>
                <Activity className="h-3.5 w-3.5" />
                {momentum.state}
              </Badge>
              <Badge>{momentum.trendLabel}</Badge>
            </div>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold text-white">Momentum is the score that survives real life.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{momentum.explanation}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {momentum.signals.map((signal) => (
                <div key={signal.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{signal.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>
          <ProgressRing value={momentum.score} label="momentum" className="justify-self-center" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <MomentumTrendGraph momentum={momentum} />
          <MomentumModeIndicator momentum={momentum} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyRecapCard({ recap }: { recap: WeeklyRecap }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-primary">
          <TrendingUp className="h-5 w-5" />
          <span className="text-sm font-semibold">Weekly recap</span>
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-white">{recap.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{recap.summary}</p>

        <div className="mt-5 grid gap-3">
          {[
            ["Strongest week", recap.strongestWeek],
            ["Comeback moment", recap.comebackMoment],
            ["Adherence insight", recap.adherenceInsight],
            ["Recovery trend", recap.recoveryTrend]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
              <p className="mt-2 text-sm leading-6 text-white">{value}</p>
            </div>
          ))}
        </div>

        <Button asChild className="mt-5 w-full justify-between">
          <a href="/workout">
            Protect this week&apos;s momentum
            <RotateCcw className="h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
