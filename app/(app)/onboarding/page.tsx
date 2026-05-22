import { Suspense } from "react";

import { OnboardingForm } from "@/components/onboarding-form";
import { PageHeader } from "@/components/page-header";

export default function OnboardingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Setup"
        title="Let's build a plan that bends instead of breaks."
        copy="A few honest answers help FlexFit tune volume, exercise selection, and recovery guidance."
      />
      <Suspense>
        <OnboardingForm />
      </Suspense>
    </>
  );
}
