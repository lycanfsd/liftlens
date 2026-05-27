export const mainPRLifts = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-Up / Lat Pulldown"
] as const;

export type PRLift = (typeof mainPRLifts)[number];

export type PRHistoryEntry = {
  id: string;
  lift: string;
  date: string;
  oneRepMax: number;
  unit: "lb" | "kg";
  notes?: string;
  createdAt: string;
};

export function getPRStorageKey(userId?: string | null) {
  return userId ? `flexfit-pr-history-${userId}` : "flexfit-pr-history-local";
}

function isPRHistoryEntry(value: unknown): value is PRHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<PRHistoryEntry>;

  return (
    typeof entry.id === "string" &&
    typeof entry.lift === "string" &&
    typeof entry.date === "string" &&
    typeof entry.oneRepMax === "number" &&
    Number.isFinite(entry.oneRepMax) &&
    (entry.unit === "lb" || entry.unit === "kg") &&
    typeof entry.createdAt === "string"
  );
}

function sortByDateAscending(entries: PRHistoryEntry[]) {
  return [...entries].sort((a, b) => {
    const dateDelta = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDelta !== 0) return dateDelta;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function getPRHistory(storageKey: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortByDateAscending(parsed.filter(isPRHistoryEntry));
  } catch {
    return [];
  }
}

export function persistPRHistory(storageKey: string, entries: PRHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(sortByDateAscending(entries)));
}

export function mergePRHistoryEntry(entries: PRHistoryEntry[], entry: PRHistoryEntry) {
  const existingIndex = entries.findIndex(
    (current) => current.lift === entry.lift && current.date === entry.date
  );

  return sortByDateAscending(
    existingIndex >= 0
      ? entries.map((current, index) =>
          index === existingIndex
            ? {
                ...current,
                oneRepMax: entry.oneRepMax,
                unit: entry.unit,
                notes: entry.notes,
                createdAt: current.createdAt
              }
            : current
        )
      : [...entries, entry]
  );
}

export function savePRHistoryEntry(storageKey: string, entry: PRHistoryEntry) {
  const next = mergePRHistoryEntry(getPRHistory(storageKey), entry);
  persistPRHistory(storageKey, next);
  return next;
}

export function getEntriesForLift(entries: PRHistoryEntry[], lift: string, unit: "lb" | "kg" = "lb") {
  return sortByDateAscending(entries.filter((entry) => entry.lift === lift && entry.unit === unit));
}

export function getLatestPRForLift(entries: PRHistoryEntry[], lift: string, unit: "lb" | "kg" = "lb") {
  const liftEntries = getEntriesForLift(entries, lift, unit);
  return liftEntries[liftEntries.length - 1] ?? null;
}

export function getAllTimePRForLift(entries: PRHistoryEntry[], lift: string, unit: "lb" | "kg" = "lb") {
  const liftEntries = getEntriesForLift(entries, lift, unit);
  return liftEntries.reduce<PRHistoryEntry | null>((best, entry) => {
    if (!best || entry.oneRepMax > best.oneRepMax) return entry;
    return best;
  }, null);
}

export function getPRChangeForLift(entries: PRHistoryEntry[], lift: string, unit: "lb" | "kg" = "lb") {
  const liftEntries = getEntriesForLift(entries, lift, unit);
  if (liftEntries.length < 2) return null;
  const latest = liftEntries[liftEntries.length - 1];
  const previous = liftEntries[liftEntries.length - 2];
  return latest.oneRepMax - previous.oneRepMax;
}

export function getPRPercentChangeForLift(entries: PRHistoryEntry[], lift: string, unit: "lb" | "kg" = "lb") {
  const liftEntries = getEntriesForLift(entries, lift, unit);
  if (liftEntries.length < 2) return null;
  const latest = liftEntries[liftEntries.length - 1];
  const previous = liftEntries[liftEntries.length - 2];
  if (!previous.oneRepMax) return null;
  return ((latest.oneRepMax - previous.oneRepMax) / previous.oneRepMax) * 100;
}

export function formatPRDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
