"use client";

import { useState } from "react";
import { Target } from "lucide-react";

import { GoalBadge } from "@/components/goal-badge";
import { Card, CardContent } from "@/components/ui/card";
import { weakPoints } from "@/lib/constants";
import type { WeakPoint } from "@/lib/types";
import { getWeakPointPlan } from "@/lib/workout/weak-points";
import { cn } from "@/lib/utils";

export function WeakPointBuilder() {
  const [weakPoint, setWeakPoint] = useState<WeakPoint>("shoulders");
  const plan = getWeakPointPlan(weakPoint);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardContent className="grid grid-cols-2 gap-2 p-5 lg:grid-cols-1">
          {weakPoints.map((point) => (
            <button
              key={point.value}
              onClick={() => setWeakPoint(point.value)}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-white",
                weakPoint === point.value && "border-primary/60 bg-primary/10 text-white"
              )}
            >
              {point.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <GoalBadge>{weakPoints.find((point) => point.value === weakPoint)?.label}</GoalBadge>
            <GoalBadge>Quiet bias, not obsession</GoalBadge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Add a small edge without hijacking the plan.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Weak-point work should be repeatable. Two accessories, clear frequency, and one metric are enough.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Target className="h-4 w-4 text-primary" />
                Accessories
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {plan.accessories.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="font-semibold text-white">Suggested frequency</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.frequency}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="font-semibold text-white">Common mistakes</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {plan.commonMistakes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <h3 className="font-semibold text-white">Progress metric</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.progressMetric}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
