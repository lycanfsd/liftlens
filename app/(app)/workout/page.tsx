import { PageHeader } from "@/components/page-header";
import { SafetyDisclaimer } from "@/components/safety-disclaimer";
import { WorkoutGenerator } from "@/components/workout-generator";

export default function WorkoutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Daily adaptive workout"
        title="Tell us what today looks like. We'll adjust the plan."
        copy="Time, energy, soreness, equipment, and gym crowding all matter. Generate a session that is useful instead of unrealistic."
      />
      <WorkoutGenerator />
      <div className="mt-6">
        <SafetyDisclaimer />
      </div>
    </>
  );
}
