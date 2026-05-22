import { PageHeader } from "@/components/page-header";
import { RecoveryPlanner } from "@/components/recovery-planner";

export default function RecoveryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Missed-day recovery"
        title="No guilt. Adjust and keep going."
        copy="Choose what happened and FlexFit will recommend a practical re-entry plan without revenge volume."
      />
      <RecoveryPlanner />
    </>
  );
}
