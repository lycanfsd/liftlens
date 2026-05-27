"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

import { completeTutorialAction } from "@/app/app-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tutorialSteps = [
  {
    title: "Start with Today",
    copy: "This is your daily training hub."
  },
  {
    title: "Check in",
    copy: "Time, energy, soreness, and equipment shape the plan."
  },
  {
    title: "Use exercise help",
    copy: "Video opens demos. Text opens form coaching."
  },
  {
    title: "Complete the session",
    copy: "Mark it complete to lock in progress."
  },
  {
    title: "Track Progress",
    copy: "PRs, consistency, volume, physique, and recovery live there."
  },
  {
    title: "Come back tomorrow",
    copy: "The next plan adapts to the next real day."
  }
];

export function TutorialOverlay({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const current = tutorialSteps[step];
  const progress = Math.round(((step + 1) / tutorialSteps.length) * 100);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  function finish() {
    startTransition(async () => {
      await completeTutorialAction();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="NOVYRA tutorial"
        className="relative w-full max-w-lg rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.11),transparent_36%),rgba(0,0,0,0.92)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <button
          type="button"
          aria-label="Skip tutorial"
          onClick={finish}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-10">
          <p className="text-sm font-semibold text-primary">NOVYRA tutorial</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{current.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{current.copy}</p>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{step + 1} of {tutorialSteps.length}</span>
          <span>{progress}%</span>
        </div>

        <div className="mt-6 grid grid-cols-6 gap-2">
          {tutorialSteps.map((item, index) => (
            <span
              key={item.title}
              className={cn("h-1.5 rounded-full bg-white/10", index <= step && "bg-primary")}
            />
          ))}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={finish} disabled={isPending} className="text-muted-foreground hover:text-white">
            Skip
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={step === 0 || isPending} onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < tutorialSteps.length - 1 ? (
              <Button type="button" onClick={() => setStep((currentStep) => currentStep + 1)}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={finish} disabled={isPending}>
                <Check className="h-4 w-4" />
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
