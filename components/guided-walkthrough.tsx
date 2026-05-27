"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { completeTutorialAction } from "@/app/app-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WalkthroughPlacement = "top" | "right" | "bottom" | "left" | "center";

type WalkthroughStep = {
  id: string;
  route: string;
  target?: string;
  title: string;
  body: string;
  placement: WalkthroughPlacement;
  final?: boolean;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    target: "[data-tour='dashboard-overview'], [data-tour='sidebar-dashboard']",
    title: "Dashboard overview",
    body: "Start here to get a quick overview of your training, progress, and daily plan.",
    placement: "bottom"
  },
  {
    id: "today-page",
    route: "/workout",
    target: "[data-tour='today-page'], [data-tour='today-nav']",
    title: "Today is your training hub",
    body: "Today is where NOVYRA builds your workout around your time, energy, soreness, and equipment.",
    placement: "bottom"
  },
  {
    id: "daily-checkin",
    route: "/workout",
    target: "[data-tour='daily-checkin']",
    title: "Check in before training",
    body: "Tell NOVYRA what today looks like. Your workout adapts to real life, not a perfect schedule.",
    placement: "top"
  },
  {
    id: "exercise-help",
    route: "/workout",
    target: "[data-tour='exercise-help-icons']",
    title: "Use exercise support",
    body: "Use the video icon for a demo placeholder and the text icon for step-by-step form coaching.",
    placement: "left"
  },
  {
    id: "complete-workout",
    route: "/workout",
    target: "[data-tour='complete-workout']",
    title: "Lock in your progress",
    body: "After training, tap Complete Workout. This saves the session and updates your analytics.",
    placement: "top"
  },
  {
    id: "progress",
    route: "/progress",
    target: "[data-tour='progress-analytics'], [data-tour='progress-nav']",
    title: "Progress shows the impact",
    body: "See consistency, strength, physique trends, recovery, and muscle balance in one calm dashboard.",
    placement: "bottom"
  },
  {
    id: "strength-pr",
    route: "/progress",
    target: "[data-tour='strength-pr-tracker']",
    title: "Track strength PRs",
    body: "Log your one-rep maxes here. The graph updates so you can see strength trending upward.",
    placement: "top"
  },
  {
    id: "recovery",
    route: "/progress",
    target: "[data-tour='recovery-readiness'], [data-tour='recovery-nav']",
    title: "Use recovery signals",
    body: "Recovery helps decide when to push, maintain, or back off for better long-term progress.",
    placement: "top"
  },
  {
    id: "finish",
    route: "/workout",
    title: "You're ready to train",
    body: "Start with Today, complete your workout, then check Progress to see what's improving.",
    placement: "center",
    final: true
  }
];

function localTourKey(userId?: string | null) {
  return `novyra-app-tour-${userId ?? "local"}`;
}

function elementIsVisible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function findVisibleTarget(selector: string) {
  return Array.from(document.querySelectorAll(selector)).find(elementIsVisible) ?? null;
}

function rectFromElement(element: Element): TargetRect {
  const rect = element.getBoundingClientRect();
  const padding = 8;

  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
    height: Math.min(window.innerHeight - 16, rect.height + padding * 2)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTooltipStyle(rect: TargetRect | null, placement: WalkthroughPlacement, viewport: { width: number; height: number }) {
  if (!rect || viewport.width < 768 || placement === "center") return undefined;

  const width = Math.min(360, viewport.width - 32);
  const estimatedHeight = 250;
  const gap = 18;
  let top = rect.top + rect.height / 2 - estimatedHeight / 2;
  let left = rect.left + rect.width + gap;

  if (placement === "left") {
    left = rect.left - width - gap;
  }

  if (placement === "top") {
    top = rect.top - estimatedHeight - gap;
    left = rect.left + rect.width / 2 - width / 2;
  }

  if (placement === "bottom") {
    top = rect.top + rect.height + gap;
    left = rect.left + rect.width / 2 - width / 2;
  }

  return {
    width,
    left: clamp(left, 16, viewport.width - width - 16),
    top: clamp(top, 16, Math.max(16, viewport.height - estimatedHeight - 16))
  };
}

export function GuidedWalkthrough({ userId }: { userId?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const [isPending, startTransition] = useTransition();
  const currentStep = walkthroughSteps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / walkthroughSteps.length) * 100);
  const tooltipStyle = useMemo(
    () => getTooltipStyle(targetRect, currentStep.placement, viewport),
    [currentStep.placement, targetRect, viewport]
  );
  const isSheet = viewport.width < 768 && !currentStep.final;

  useEffect(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });

    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (searchParams.get("tutorial") !== "1") return;

    setStepIndex(0);
    setOpen(true);
    window.localStorage.removeItem(localTourKey(userId));
    router.replace(pathname);
  }, [pathname, router, searchParams, userId]);

  useEffect(() => {
    if (!open || pathname === currentStep.route) return;
    router.push(currentStep.route);
  }, [currentStep.route, open, pathname, router]);

  const refreshTarget = useCallback(() => {
    if (!currentStep.target || pathname !== currentStep.route) {
      setTargetRect(null);
      setTargetMissing(Boolean(currentStep.target));
      return;
    }

    const target = findVisibleTarget(currentStep.target);

    if (!target) {
      setTargetRect(null);
      setTargetMissing(true);
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    window.setTimeout(() => {
      setTargetRect(rectFromElement(target));
      setTargetMissing(false);
    }, 180);
  }, [currentStep.route, currentStep.target, pathname]);

  useEffect(() => {
    if (!open) return;

    let attempts = 0;
    let cancelled = false;
    setTargetRect(null);
    setTargetMissing(false);

    function tryTarget() {
      if (cancelled) return;
      refreshTarget();
      attempts += 1;

      if (attempts < 14) {
        window.setTimeout(tryTarget, 120);
      }
    }

    window.setTimeout(tryTarget, 120);
    return () => {
      cancelled = true;
    };
  }, [open, refreshTarget, stepIndex]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        finish("skipped");
      }
    }

    function handleViewportChange() {
      refreshTarget();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refreshTarget]);

  function finish(mode: "completed" | "skipped") {
    startTransition(async () => {
      try {
        window.localStorage.setItem(localTourKey(userId), mode);
        await completeTutorialAction(mode);
      } finally {
        setOpen(false);
        setStepIndex(0);
        setTargetRect(null);
        if (mode === "completed") {
          router.push("/workout");
        }
      }
    });
  }

  if (!open) return null;

  const centered = currentStep.final || !targetRect;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-live="polite"
      >
        {targetRect && !currentStep.final ? (
          <motion.div
            className="pointer-events-none fixed rounded-[1.45rem] border border-primary/55 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.72),0_0_38px_rgba(74,222,128,0.22)]"
            animate={targetRect}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <motion.div className="fixed inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        )}

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="NOVYRA app tour"
          className={cn(
            "rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.12),transparent_38%),rgba(9,9,11,0.94)] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.62)] backdrop-blur-xl",
            isSheet
              ? "fixed inset-x-3 bottom-3"
              : centered
                ? "fixed left-1/2 top-1/2 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2"
                : "fixed w-[min(360px,calc(100vw-32px))]"
          )}
          style={tooltipStyle}
          initial={{ opacity: 0, scale: 0.96, y: isSheet ? 24 : 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            aria-label="Skip app tour"
            onClick={() => finish("skipped")}
            disabled={isPending}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Step {stepIndex + 1} of {walkthroughSteps.length}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-white">{currentStep.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{currentStep.body}</p>
            {targetMissing && !currentStep.final ? (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-muted-foreground">
                This area appears after you generate a workout. You can continue the tour now and come back to it later.
              </p>
            ) : null}
          </div>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => finish("skipped")} disabled={isPending} className="text-muted-foreground hover:text-white">
              Skip
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0 || isPending}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {currentStep.final ? (
                <Button type="button" onClick={() => finish("completed")} disabled={isPending}>
                  <Check className="h-4 w-4" />
                  Go to Today
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setStepIndex((current) => Math.min(walkthroughSteps.length - 1, current + 1))}
                  disabled={isPending}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
