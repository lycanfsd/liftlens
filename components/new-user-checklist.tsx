"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

import { markChecklistItemAction } from "@/app/app-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ChecklistProgress = {
  completedProfile?: boolean;
  generatedFirstWorkout?: boolean;
  openedInstruction?: boolean;
  completedFirstWorkout?: boolean;
  loggedFirstPr?: boolean;
  visitedProgress?: boolean;
};

const localChecklistKey = "novyra-new-user-checklist";

const checklistItems: Array<{ key: keyof ChecklistProgress; label: string; href?: string }> = [
  { key: "completedProfile", label: "Complete your profile", href: "/profile" },
  { key: "generatedFirstWorkout", label: "Generate your first workout", href: "/workout" },
  { key: "openedInstruction", label: "Open an exercise instruction" },
  { key: "completedFirstWorkout", label: "Complete your first workout", href: "/workout" },
  { key: "loggedFirstPr", label: "Log your first PR", href: "/progress" },
  { key: "visitedProgress", label: "Visit Progress Analytics", href: "/progress" }
];

function loadLocalChecklist() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(localChecklistKey);
    return raw ? (JSON.parse(raw) as ChecklistProgress) : {};
  } catch {
    return {};
  }
}

function saveLocalChecklist(progress: ChecklistProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localChecklistKey, JSON.stringify(progress));
}

export function NewUserChecklist({
  initialProgress = {},
  generatedWorkout,
  completedWorkout,
  userId
}: {
  initialProgress?: ChecklistProgress;
  generatedWorkout: boolean;
  completedWorkout: boolean;
  userId?: string | null;
}) {
  const [progress, setProgress] = useState<ChecklistProgress>(initialProgress);
  const [collapsed, setCollapsed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (userId) {
      setProgress(initialProgress);
      return;
    }

    const next = { ...loadLocalChecklist(), ...initialProgress };
    setProgress(next);
    saveLocalChecklist(next);
  }, [initialProgress, userId]);

  useEffect(() => {
    const updates: ChecklistProgress = {};
    if (generatedWorkout) updates.generatedFirstWorkout = true;
    if (completedWorkout) {
      updates.completedFirstWorkout = true;
      updates.generatedFirstWorkout = true;
    }
    if (!Object.keys(updates).length) return;
    setProgress((current) => {
      const next = { ...current, ...updates };
      if (!userId) saveLocalChecklist(next);
      return next;
    });
  }, [completedWorkout, generatedWorkout, userId]);

  const completedCount = useMemo(
    () => checklistItems.filter((item) => progress[item.key]).length,
    [progress]
  );
  const complete = completedCount === checklistItems.length;

  if (complete && collapsed) return null;

  function mark(key: keyof ChecklistProgress) {
    setProgress((current) => {
      const next = { ...current, [key]: true };
      if (!userId) saveLocalChecklist(next);
      return next;
    });

    if (userId) {
      startTransition(async () => {
        await markChecklistItemAction(key);
      });
    }
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/[0.08]", complete && "bg-primary/10")}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">Get started</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {complete ? "Setup complete" : `${completedCount} of ${checklistItems.length} complete`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {complete
                ? "Your daily loop is live. Come back tomorrow and keep the signal moving."
                : "A few small actions unlock better workouts and clearer progress."}
            </p>
          </div>
          {complete ? (
            <Button type="button" variant="ghost" onClick={() => setCollapsed(true)}>
              Hide
            </Button>
          ) : null}
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completedCount / checklistItems.length) * 100}%` }} />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {checklistItems.map((item) => {
            const done = Boolean(progress[item.key]);
            const waitsForAppAction = item.key === "openedInstruction";
            const content = (
              <span className="flex items-center gap-2">
                {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                {item.label}
              </span>
            );

            if (item.href && !done) {
              return (
                <a
                  key={item.key}
                  href={item.href}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm font-semibold text-white transition hover:border-primary/30 hover:bg-white/[0.055]"
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (!waitsForAppAction) mark(item.key);
                }}
                disabled={waitsForAppAction && !done}
                className={cn(
                  "rounded-2xl border p-3 text-left text-sm font-semibold transition",
                  done ? "border-primary/20 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.035] text-white hover:border-primary/30 hover:bg-white/[0.055]",
                  waitsForAppAction && !done && "cursor-default opacity-80 hover:border-white/10 hover:bg-white/[0.035]"
                )}
              >
                {content}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
