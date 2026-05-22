"use client";

import Link from "next/link";
import { Check, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    copy: "Start adapting workouts without friction.",
    features: ["Daily rule-based workout builder", "Recovery plan", "Weak-point builder", "Demo dashboard"],
    cta: "Start Free",
    href: "/signup",
    highlighted: false
  },
  {
    name: "Pro",
    price: "$9.99/mo",
    copy: "For busy people who want deeper coaching.",
    features: ["OpenAI coach upgrade", "Workout history insights", "Meal ideas for busy days", "Smarter substitutions"],
    cta: "Stripe checkout coming soon",
    highlighted: true
  },
  {
    name: "Elite",
    price: "$19.99/mo",
    copy: "For advanced adaptation and accountability.",
    features: ["Recovery trend logic", "Weak-point cycles", "Priority feature access", "Advanced progress analytics"],
    cta: "Stripe checkout coming soon",
    highlighted: false
  }
];

export function PricingCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={cn(
            "relative overflow-hidden bg-white/[0.04]",
            plan.highlighted && "border-primary/50 shadow-green"
          )}
        >
          {plan.highlighted ? (
            <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
              Popular
            </div>
          ) : null}
          <CardContent className="p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-primary">
              {plan.highlighted ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">{plan.name}</h2>
            <p className="mt-2 text-4xl font-semibold text-white">{plan.price}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.copy}</p>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan.href ? (
              <Button asChild className="mt-6 w-full">
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            ) : (
              <Button disabled className="mt-6 w-full">
                {plan.cta}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
