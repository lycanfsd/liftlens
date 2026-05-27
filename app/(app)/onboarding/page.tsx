import { Suspense } from "react";

import { OnboardingForm } from "@/components/onboarding-form";
import { PageHeader } from "@/components/page-header";

export default function OnboardingPage() {
  return (
    <>
      <PageHeader
        eyebrow="NOVYRA setup"
        title="Set your training direction."
        copy="Fast answers now. Sharper daily plans later."
      />
      <Suspense>
        <OnboardingForm />
      </Suspense>
    </>
  );
}
