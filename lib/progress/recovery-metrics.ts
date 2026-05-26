export type RecoveryLogEntry = {
  id: string;
  date: string;
  sleepHours: number;
  energy: number;
  soreness: number;
  stress: number;
  workoutRpe: number;
  score: number;
};

export function calculateRecoveryScore({
  sleepHours,
  energy,
  soreness,
  stress,
  workoutRpe
}: {
  sleepHours: number;
  energy: number;
  soreness: number;
  stress: number;
  workoutRpe: number;
}) {
  const sleepScore = Math.min(100, Math.max(20, (sleepHours / 8) * 100));
  const energyScore = Math.min(100, Math.max(10, energy * 10));
  const sorenessScore = Math.min(100, Math.max(0, 110 - soreness * 10));
  const stressScore = Math.min(100, Math.max(0, 110 - stress * 10));
  const rpeScore = Math.min(100, Math.max(35, 110 - workoutRpe * 7));

  return Math.round((sleepScore + energyScore + sorenessScore + stressScore + rpeScore) / 5);
}

export function recoveryInterpretation(score: number) {
  if (score >= 80) return "Ready to push";
  if (score >= 60) return "Good, train normally";
  if (score >= 40) return "Moderate, consider reducing intensity";
  return "Low recovery, prioritize rest or lighter training";
}
