"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RecoveryWindow } from "@/lib/types";
import { getRecoveryPlan } from "@/lib/workout/recovery";
import { cn } from "@/lib/utils";

const options: { value: RecoveryWindow; label: string }[] = [
  { value: "1-day", label: "Missed 1 day" },
  { value: "2-3-days", label: "Missed 2-3 days" },
  { value: "1-week-plus", label: "Missed 1 week+" }
];

export function RecoveryPlanner() {
  const [window, setWindow] = useState<RecoveryWindow>("1-day");
  const plan = getRecoveryPlan(window);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardContent className="space-y-3 p-5">
          {options.map((option) => (
            <Button
              key={option.value}
              variant={window === option.value ? "default" : "outline"}
              className={cn("w-full justify-start", window !== option.value && "text-muted-foreground")}
              onClick={() => setWindow(option.value)}
            >
              <RotateCcw className="h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="p-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-primary">{plan.reassurance}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{plan.title}</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Today", plan.today],
              ["Next workout", plan.nextWorkout],
              ["Weekly reset", plan.weeklyReset]
            ].map(([title, items]) => (
              <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h3 className="font-semibold text-white">{title as string}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {(items as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
