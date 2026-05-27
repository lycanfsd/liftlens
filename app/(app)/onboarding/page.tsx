import { Suspense } from "react";

import { OnboardingForm } from "@/components/onboarding-form";
import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/brand";

export default function OnboardingPage() {
  return (
    <>
      <PageHeader
        eyebrow={`${APP_NAME} setup`}
        title="Set your training direction."
        copy="Fast answers now. Sharper daily plans later."
      />
      <Suspense>
        <OnboardingForm />
      </Suspense>
    </>
  );
}
