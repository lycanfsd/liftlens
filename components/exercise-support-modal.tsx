"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Dumbbell, FileText, ListChecks, PlayCircle, ShieldCheck, Target, Video, Wind, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { ExercisePrescription } from "@/lib/types";
import { getExerciseInstructions } from "@/lib/workout/exercise-instructions";

export type ExerciseSupportMode = "video" | "instructions";

function sectionIcon(title: string): LucideIcon {
  if (title === "Setup") return ListChecks;
  if (title === "How to perform") return Target;
  if (title === "Form cues") return FileText;
  if (title === "Breathing") return Wind;
  if (title === "Common mistakes") return AlertTriangle;
  if (title === "Safety tips") return ShieldCheck;
  if (title === "Muscles worked") return Dumbbell;
  return FileText;
}

function ExerciseModalShell({
  title,
  label,
  onClose,
  children
}: {
  title: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border border-primary/25 bg-zinc-950/90 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl sm:max-h-[90vh] sm:p-6"
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute right-8 top-0 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close exercise support"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </motion.div>
    </motion.div>
  );
}

function ExerciseVideoModal({ exercise, onClose }: { exercise: ExercisePrescription; onClose: () => void }) {
  const videoUrl = exercise.videoUrl?.trim();

  return (
    <ExerciseModalShell title={`${exercise.name} Demo`} label="Exercise demo" onClose={onClose}>
      <div className="mt-5">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            className="aspect-video w-full rounded-2xl border border-primary/20 bg-black object-cover shadow-[0_0_50px_rgba(52,211,153,0.12)]"
          />
        ) : (
          <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl border border-primary/25 bg-black/45 shadow-[0_0_50px_rgba(52,211,153,0.12)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.16),transparent_46%)]" />
            <div className="relative text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-[0_0_34px_rgba(52,211,153,0.22)]">
                <PlayCircle className="h-8 w-8" strokeWidth={1.7} />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">Demo video coming soon</p>
              <p className="mt-1 text-xs text-muted-foreground">A short form video will appear here once added.</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Use this as a quick form reference before your set. Keep reps controlled and stop if anything feels sharp or unstable.
      </p>
    </ExerciseModalShell>
  );
}

function ExerciseInstructionsModal({ exercise, onClose }: { exercise: ExercisePrescription; onClose: () => void }) {
  const sections = getExerciseInstructions(exercise);

  return (
    <ExerciseModalShell title={`How to perform ${exercise.name}`} label="Exercise instructions" onClose={onClose}>
      <div className="relative -mx-1 mt-4 min-h-0">
        <div className="grid max-h-[calc(100vh-11rem)] gap-2.5 overflow-y-auto overscroll-contain px-1 pb-1 pr-2 [scrollbar-color:rgba(74,222,128,0.45)_transparent] [scrollbar-width:thin] sm:max-h-[64vh]">
          {sections.map((section) => {
            const Icon = sectionIcon(section.title);

            return (
              <section
                key={section.title}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-3.5 shadow-[0_14px_38px_rgba(0,0,0,0.18)] sm:p-4"
              >
                <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[13px] leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70 shadow-[0_0_10px_rgba(74,222,128,0.35)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </ExerciseModalShell>
  );
}

export function ExerciseSupportModal({
  exercise,
  mode,
  onClose
}: {
  exercise: ExercisePrescription;
  mode: ExerciseSupportMode | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {mode === "video" ? <ExerciseVideoModal exercise={exercise} onClose={onClose} /> : null}
      {mode === "instructions" ? <ExerciseInstructionsModal exercise={exercise} onClose={onClose} /> : null}
    </AnimatePresence>
  );
}

export function ExerciseActionButtons({
  exerciseName,
  onVideo,
  onInstructions
}: {
  exerciseName: string;
  onVideo: () => void;
  onInstructions: () => void;
}) {
  return (
    <div data-tour="exercise-help-icons" className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Watch demo for ${exerciseName}`}
        title={`Watch demo for ${exerciseName}`}
        onClick={onVideo}
        className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
      >
        <Video className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`View instructions for ${exerciseName}`}
        title={`View instructions for ${exerciseName}`}
        onClick={onInstructions}
        className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.035] text-muted-foreground hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
      >
        <FileText className="h-4 w-4" />
      </Button>
    </div>
  );
}
