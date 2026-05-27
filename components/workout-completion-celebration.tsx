"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export function CompletionSuccessModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-md"
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
            aria-labelledby="completion-success-title"
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-primary/30 bg-zinc-950/85 p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-7"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {[0, 1, 2, 3, 4].map((item) => (
              <motion.span
                key={item}
                className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_16px_rgba(52,211,153,0.6)]"
                style={{
                  left: `${22 + item * 14}%`,
                  top: item % 2 === 0 ? "22%" : "15%"
                }}
                initial={{ opacity: 0, scale: 0.4, y: 8 }}
                animate={{ opacity: [0, 0.9, 0.35], scale: [0.4, 1, 0.7], y: [8, -8, -14] }}
                transition={{ duration: 1.2, delay: 0.1 + item * 0.08, ease: "easeOut" }}
              />
            ))}

            <motion.div
              className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-[0_0_48px_rgba(52,211,153,0.24)]"
              initial={{ scale: 0.82 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/35"
                initial={{ scale: 0.82, opacity: 0.75 }}
                animate={{ scale: 1.25, opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
              <CheckCircle2 className="h-10 w-10" strokeWidth={1.8} />
            </motion.div>

            <h2 id="completion-success-title" className="mt-6 text-2xl font-semibold tracking-normal text-white">
              Workout complete
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Good work &mdash; today&rsquo;s workout is done. Keep stacking wins.
            </p>

            <Button type="button" size="lg" className="mt-6 w-full" onClick={onClose}>
              Nice
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function CompletedTodayBanner({ show }: { show: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 via-white/[0.045] to-white/[0.025] shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
          initial={{ opacity: 0, y: -10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex items-center gap-4 p-4 sm:p-5">
            <div className="pointer-events-none absolute left-4 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl" />
            <motion.div
              className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary"
              animate={{ boxShadow: ["0 0 0 rgba(52,211,153,0)", "0 0 30px rgba(52,211,153,0.22)", "0 0 0 rgba(52,211,153,0)"] }}
              transition={{ duration: 1.8, repeat: 1, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-6 w-6" strokeWidth={1.9} />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-white">Completed today</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Great work showing up. Recovery starts now.</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
