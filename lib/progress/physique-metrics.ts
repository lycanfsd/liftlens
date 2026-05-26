export type PhysiqueMeasurementEntry = {
  id: string;
  date: string;
  weight?: number | null;
  waist?: number | null;
  chest?: number | null;
  shoulders?: number | null;
  arms?: number | null;
  thighs?: number | null;
  hipsGlutes?: number | null;
  bodyFat?: number | null;
};

export const physiqueMetricLabels: Array<{
  key: keyof Omit<PhysiqueMeasurementEntry, "id" | "date">;
  label: string;
  unit: string;
}> = [
  { key: "weight", label: "Body weight", unit: "lb" },
  { key: "waist", label: "Waist", unit: "in" },
  { key: "chest", label: "Chest", unit: "in" },
  { key: "shoulders", label: "Shoulders", unit: "in" },
  { key: "arms", label: "Arms", unit: "in" },
  { key: "thighs", label: "Thighs", unit: "in" },
  { key: "hipsGlutes", label: "Hips/glutes", unit: "in" },
  { key: "bodyFat", label: "Body fat", unit: "%" }
];

export function latestPhysiqueEntries(entries: PhysiqueMeasurementEntry[]) {
  return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function metricChange(
  entries: PhysiqueMeasurementEntry[],
  key: keyof Omit<PhysiqueMeasurementEntry, "id" | "date">
) {
  const sorted = latestPhysiqueEntries(entries).filter((entry) => typeof entry[key] === "number");
  const latest = sorted[0]?.[key];
  const previous = sorted[1]?.[key];

  if (typeof latest !== "number") return null;

  return {
    latest,
    previous: typeof previous === "number" ? previous : null,
    change: typeof previous === "number" ? latest - previous : null
  };
}
