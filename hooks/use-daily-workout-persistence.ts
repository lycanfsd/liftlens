"use client";

import { useCallback, useEffect, useState } from "react";

import { loadTodayDailyWorkoutAction } from "@/app/app-actions";
import type { DailyCheckIn, DailyWorkoutRecord, DailyWorkoutStatus, GeneratedWorkout } from "@/lib/types";

type PersistenceSource = "backend" | "local" | "empty";

const debugEnabled = process.env.NEXT_PUBLIC_DEBUG_DAILY_WORKOUT_PERSISTENCE === "true";

function debugPersistence(event: string, details?: Record<string, unknown>) {
  if (debugEnabled) {
    console.debug(`[daily-workout-persistence] ${event}`, details ?? {});
  }
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(userId: string | null | undefined, workoutDate = getTodayKey()) {
  return `daily-workout-${workoutDate}-${userId ?? "unknown"}`;
}

function isDailyWorkoutRecord(value: unknown): value is DailyWorkoutRecord {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Partial<DailyWorkoutRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.workoutDate === "string" &&
    typeof record.inputSnapshot === "object" &&
    record.inputSnapshot !== null &&
    typeof record.workout === "object" &&
    record.workout !== null &&
    typeof record.title === "string" &&
    typeof record.version === "number"
  );
}

function normalizeRecord(record: DailyWorkoutRecord, fallbackUserId: string | null | undefined): DailyWorkoutRecord {
  return record.userId ? record : { ...record, userId: fallbackUserId ?? null };
}

function readLocalWorkout(userId: string | null | undefined, workoutDate = getTodayKey()) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(userId, workoutDate));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isDailyWorkoutRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalWorkout(record: DailyWorkoutRecord) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(record.userId, record.workoutDate), JSON.stringify(record));
  } catch {
    debugPersistence("local write failed", { recordId: record.id });
  }
}

function createLocalRecord({
  workout,
  input,
  userId,
  previous
}: {
  workout: GeneratedWorkout;
  input: DailyCheckIn;
  userId: string | null | undefined;
  previous?: DailyWorkoutRecord | null;
}): DailyWorkoutRecord {
  const workoutDate = getTodayKey();

  return {
    id: previous?.id.startsWith("local-") ? previous.id : `local-${workout.id}`,
    userId: userId ?? previous?.userId ?? null,
    workoutDate,
    inputSnapshot: input,
    workout,
    readinessScore: workout.readinessScore ?? null,
    trainingDose: workout.trainingDose ?? workout.intensity,
    title: workout.name,
    status: previous?.status ?? "planned",
    version: previous ? previous.version + 1 : 1,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function isLocalDailyWorkout(record: DailyWorkoutRecord | null | undefined) {
  return Boolean(record?.id.startsWith("local-"));
}

export function useDailyWorkoutPersistence({
  initialDailyWorkout,
  currentUserId
}: {
  initialDailyWorkout?: DailyWorkoutRecord | null;
  currentUserId?: string | null;
}) {
  const [dailyWorkout, setDailyWorkoutState] = useState<DailyWorkoutRecord | null>(initialDailyWorkout ?? null);
  const [source, setSource] = useState<PersistenceSource>(initialDailyWorkout ? "backend" : "empty");
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(currentUserId ?? initialDailyWorkout?.userId ?? null);
  const [hasLoaded, setHasLoaded] = useState(Boolean(initialDailyWorkout));

  const setDailyWorkout = useCallback(
    (record: DailyWorkoutRecord, nextSource: PersistenceSource = "backend") => {
      const normalized = normalizeRecord(record, resolvedUserId ?? currentUserId);

      setDailyWorkoutState(normalized);
      setResolvedUserId(normalized.userId);
      setSource(nextSource);
      setHasLoaded(true);
      writeLocalWorkout(normalized);
      debugPersistence("record applied", {
        source: nextSource,
        userId: normalized.userId,
        workoutDate: normalized.workoutDate,
        rowId: normalized.id
      });
    },
    [currentUserId, resolvedUserId]
  );

  const saveLocalFallback = useCallback(
    (workout: GeneratedWorkout, input: DailyCheckIn) => {
      const record = createLocalRecord({
        workout,
        input,
        userId: resolvedUserId ?? currentUserId,
        previous: dailyWorkout
      });

      setDailyWorkout(record, "local");
      return record;
    },
    [currentUserId, dailyWorkout, resolvedUserId, setDailyWorkout]
  );

  const updateLocalStatus = useCallback(
    (status: DailyWorkoutStatus) => {
      if (!dailyWorkout) return null;

      const updated: DailyWorkoutRecord = {
        ...dailyWorkout,
        status,
        updatedAt: new Date().toISOString()
      };

      setDailyWorkout(updated, "local");
      return updated;
    },
    [dailyWorkout, setDailyWorkout]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDailyWorkout() {
      if (initialDailyWorkout) {
        const normalized = normalizeRecord(initialDailyWorkout, currentUserId);
        setDailyWorkoutState(normalized);
        setResolvedUserId(normalized.userId);
        setSource("backend");
        setHasLoaded(true);
        writeLocalWorkout(normalized);
        debugPersistence("backend initial record loaded", {
          userId: normalized.userId,
          workoutDate: normalized.workoutDate,
          rowId: normalized.id
        });
        return;
      }

      debugPersistence("backend load attempt", {
        userId: currentUserId,
        workoutDate: getTodayKey()
      });

      try {
        const result = await loadTodayDailyWorkoutAction();
        if (cancelled) return;

        setResolvedUserId(result.userId);

        if (result.dailyWorkout) {
          const normalized = normalizeRecord(result.dailyWorkout, result.userId ?? currentUserId);
          setDailyWorkoutState(normalized);
          setSource("backend");
          setHasLoaded(true);
          writeLocalWorkout(normalized);
          debugPersistence("backend load success", {
            userId: normalized.userId,
            workoutDate: normalized.workoutDate,
            rowId: normalized.id
          });
          return;
        }

        const fallback = readLocalWorkout(result.userId ?? currentUserId, result.workoutDate);
        if (fallback) {
          const normalized = normalizeRecord(fallback, result.userId ?? currentUserId);
          setDailyWorkoutState(normalized);
          setSource("local");
          setHasLoaded(true);
          debugPersistence("local fallback loaded", {
            userId: normalized.userId,
            workoutDate: normalized.workoutDate,
            rowId: normalized.id,
            backendMessage: result.error ?? result.debugMessage
          });
          return;
        }

        setSource("empty");
        setHasLoaded(true);
        debugPersistence("no daily workout found", {
          userId: result.userId ?? currentUserId,
          workoutDate: result.workoutDate
        });
      } catch (error) {
        if (cancelled) return;

        const fallback = readLocalWorkout(currentUserId);
        if (fallback) {
          const normalized = normalizeRecord(fallback, currentUserId);
          setDailyWorkoutState(normalized);
          setSource("local");
          setHasLoaded(true);
          debugPersistence("local fallback loaded after backend error", {
            userId: normalized.userId,
            workoutDate: normalized.workoutDate,
            rowId: normalized.id,
            error: error instanceof Error ? error.message : "Unknown load error"
          });
          return;
        }

        setSource("empty");
        setHasLoaded(true);
        debugPersistence("backend load failed with no fallback", {
          userId: currentUserId,
          workoutDate: getTodayKey(),
          error: error instanceof Error ? error.message : "Unknown load error"
        });
      }
    }

    void loadDailyWorkout();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, initialDailyWorkout]);

  return {
    dailyWorkout,
    hasLoaded,
    source,
    userId: resolvedUserId,
    setDailyWorkout,
    saveLocalFallback,
    updateLocalStatus
  };
}
