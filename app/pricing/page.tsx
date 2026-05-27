import Link from "next/link";

import { Logo } from "@/components/logo";
import { PageHeader } from "@/components/page-header";
import { PricingCards } from "@/components/pricing-cards";
import { SafetyDisclaimer } from "@/components/safety-disclaimer";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Logo variant="compact" size="sm" />
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back home</Link>
          </Button>
        </header>
        <section className="py-14">
          <PageHeader
            eyebrow="Stripe-ready placeholder"
            title="Simple plans for a workout habit that survives real life."
            copy="The checkout buttons for paid tiers are intentionally marked coming soon. Wire the Stripe price IDs in env vars when billing goes live."
          />
          <PricingCards />
        </section>
        <SafetyDisclaimer />
      </div>
    </main>
  );
}
