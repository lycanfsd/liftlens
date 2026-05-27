import { PageHeader } from "@/components/page-header";
import { RecoveryPlanner } from "@/components/recovery-planner";
import { APP_NAME } from "@/lib/brand";

export default function RecoveryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Missed-day recovery"
        title="No guilt. Adjust and keep going."
        copy={`Choose what happened and ${APP_NAME} will recommend a practical re-entry plan without revenge volume.`}
      />
      <RecoveryPlanner />
    </>
  );
}
