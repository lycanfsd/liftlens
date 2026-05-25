"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Apple,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Clock3,
  Dumbbell,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Target,
  Utensils
} from "lucide-react";

import { Logo } from "@/components/logo";
import { SafetyDisclaimer } from "@/components/safety-disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Adaptive Workout Builder",
    copy: "Daily plans shift around time, energy, soreness, focus, and equipment.",
    icon: Brain
  },
  {
    title: "Gym Crowding Substitutions",
    copy: "Packed gym? FlexFit swaps stations so momentum does not die in a line.",
    icon: Dumbbell
  },
  {
    title: "Missed-Day Recovery",
    copy: "No guilt. Adjust volume, rebuild rhythm, and keep the week alive.",
    icon: RotateCcw
  },
  {
    title: "Weak Point Training",
    copy: "Small accessory nudges for shoulders, glutes, back, core, and more.",
    icon: Target
  },
  {
    title: "Meal Ideas for Busy People",
    copy: "Simple protein-forward ideas that do not require a perfect Sunday prep.",
    icon: Utensils
  },
  {
    title: "Progress Dashboard",
    copy: "Track momentum, trained muscles, recovery balance, and energy trends over time.",
    icon: BarChart3
  }
];

const faqs = [
  {
    q: "Is FlexFit AI only for gym workouts?",
    a: "No. It adapts to full gyms, home gyms, dumbbells, and bodyweight days."
  },
  {
    q: "What happens when I miss workouts?",
    a: "The recovery flow lowers friction without shame. It adjusts volume and helps you restart cleanly."
  },
  {
    q: "Does the app replace a trainer or doctor?",
    a: "No. It helps plan workouts, but it is not medical advice and does not diagnose injuries."
  },
  {
    q: "Is the AI live in this MVP?",
    a: "The app has a rule-based generator today and a clean API route ready for OpenAI-powered coaching."
  }
];

export function LandingPage({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo className="[&>span:last-child>span:last-child]:hidden sm:[&>span:last-child>span:last-child]:block" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="shadow-green transition hover:-translate-y-0.5">
                <Link href="/dashboard">Open App</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="border border-white/10 bg-white/[0.04] text-white transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="shadow-green transition hover:-translate-y-0.5">
                  <Link href="/signup">Start Free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[88svh] items-end overflow-hidden pb-12 pt-28 sm:pb-16">
          <Image
            src="/images/flexfit-hero.png"
            alt="Focused athlete preparing for an adaptive workout in a premium dark fitness space"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/76 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-3xl"
            >
              <Badge className="mb-5 border-primary/25 bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Adaptive workouts for real life
              </Badge>
              <h1 className="text-balance text-5xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
                Your workout plan should adapt to your life.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-200 sm:text-lg">
                FlexFit AI modifies workouts based on your time, energy, soreness, equipment,
                gym crowding, and schedule so consistency feels possible on ordinary days.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                    {isAuthenticated ? "Open App" : "Start Free"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
              <div className="mt-8 grid max-w-2xl gap-3 text-sm text-zinc-300 sm:grid-cols-3">
                {["Packed gym swaps", "Missed-day recovery", "Low-energy options"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-white/10 bg-white/[0.03] py-10">
          <div className="container grid gap-4 md:grid-cols-3">
            {[
              ["1", "Check in", "Time, energy, soreness, equipment, and crowding."],
              ["2", "Adapt", "The generator changes volume, movement choice, and substitutions."],
              ["3", "Keep moving", "Save completed sessions and let consistency compound."]
            ].map(([step, title, copy]) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                  {step}
                </span>
                <h2 className="mt-4 font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-primary">The premium moment</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                FlexFit does not ask you to obey a static plan.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                The product earns trust when life changes. It turns constraints into a usable training dose,
                so the user never has to choose between perfection and quitting.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.045] to-accent/10 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-primary">Adaptive engine preview</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Today&apos;s plan changed.</h3>
                </div>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  82 fit score
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Only 20 minutes", "Condenses to a three-move circuit instead of cancelling the day."],
                  ["Legs are sore", "Shifts volume away from heavy lower work and keeps movement quality high."],
                  ["Gym is packed", "Uses dumbbell and bodyweight substitutions that stay in one area."]
                ].map(([signal, response]) => (
                  <div key={signal} className="grid gap-2 rounded-2xl bg-black/25 p-4 sm:grid-cols-[150px_1fr]">
                    <p className="font-semibold text-white">{signal}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{response}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Built around friction</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Fitness coaching that understands the day you actually have, not the week you planned.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="h-full bg-white/[0.04]">
                  <CardContent className="p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-white/10 bg-white/[0.03] py-20">
          <div className="container">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Pricing</p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  Start free. Upgrade when you want deeper coaching.
                </h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/pricing">Open pricing page</Link>
              </Button>
            </div>
            <PricingPreview isAuthenticated={isAuthenticated} />
          </div>
        </section>

        <section id="faq" className="container py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Friendly answers, no hype.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.q} className="bg-white/[0.04]">
                <CardContent className="p-5">
                  <div className="flex gap-3">
                    <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <h3 className="font-semibold text-white">{faq.q}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.a}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container pb-12">
          <SafetyDisclaimer />
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="container flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>Copyright 2026 FlexFit AI. Built for ordinary days that still count.</p>
        </div>
      </footer>
    </div>
  );
}

function PricingPreview({ isAuthenticated }: { isAuthenticated: boolean }) {
  const plans = [
    { name: "Free", price: "$0", copy: "Daily adaptive workouts and demo dashboard.", icon: Clock3 },
    { name: "Pro", price: "$9.99/mo", copy: "AI coach, history insights, and meal ideas.", icon: Apple },
    { name: "Elite", price: "$19.99/mo", copy: "Advanced recovery, weak-point cycles, and priority features.", icon: Sparkles }
  ];

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.name} className="bg-black/30">
          <CardContent className="p-5">
            <plan.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 text-xl font-semibold text-white">{plan.name}</h3>
            <p className="mt-2 text-3xl font-semibold text-white">{plan.price}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.copy}</p>
            <Button asChild={plan.name === "Free"} disabled={plan.name !== "Free"} className="mt-5 w-full">
              {plan.name === "Free" ? (
                <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Open App" : "Start Free"}
                </Link>
              ) : (
                <span>Stripe checkout coming soon</span>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
