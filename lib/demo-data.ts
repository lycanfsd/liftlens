import type { DashboardStat, WorkoutHistoryItem } from "@/lib/types";

export const demoStats: DashboardStat[] = [
  { label: "Workout streak", value: "4 days", detail: "Best in the last month", trend: "+2" },
  { label: "Completed workouts", value: "18", detail: "Last 30 days", trend: "+12%" },
  { label: "Weekly consistency", value: "86%", detail: "6 of 7 planned sessions" },
  { label: "Energy trend", value: "Steady", detail: "Placeholder until more check-ins" }
];

export const demoHistory: WorkoutHistoryItem[] = [
  {
    id: "demo-1",
    date: new Date().toISOString(),
    workoutName: "Momentum Builder",
    duration: 38,
    focus: "Full body",
    energy: 4,
    soreness: 2,
    completedExercises: 5
  },
  {
    id: "demo-2",
    date: new Date(Date.now() - 86400000).toISOString(),
    workoutName: "Steady Progress Session",
    duration: 30,
    focus: "Upper",
    energy: 3,
    soreness: 3,
    completedExercises: 5
  }
];
