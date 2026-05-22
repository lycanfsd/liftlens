import { CheckCircle2, CreditCard, Database, KeyRound } from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { PageHeader } from "@/components/page-header";
import { SafetyDisclaimer } from "@/components/safety-disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SettingsPage() {
  const settings = [
    {
      icon: Database,
      title: "Supabase",
      copy: isSupabaseConfigured ? "Connected through environment variables." : "Demo mode. Add env vars to persist data.",
      ready: isSupabaseConfigured
    },
    {
      icon: KeyRound,
      title: "OpenAI",
      copy: process.env.OPENAI_API_KEY ? "API key detected. Route placeholder is ready." : "Mock coach responses are active.",
      ready: Boolean(process.env.OPENAI_API_KEY)
    },
    {
      icon: CreditCard,
      title: "Stripe",
      copy: "Pricing is checkout-ready once price IDs and server checkout are wired.",
      ready: false
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Keep the product ready for launch."
        copy="Environment status, account controls, and safety guidance live here."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {settings.map((item) => (
          <Card key={item.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className={item.ready ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5"} />
                  {item.ready ? "Ready" : "Pending"}
                </span>
              </div>
              <h2 className="mt-4 font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-xl font-semibold text-white">Account</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Log out of this device. Supabase handles sessions when configured.
            </p>
            <form action={logoutAction} className="mt-5">
              <Button type="submit" variant="outline">
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="text-xl font-semibold text-white">Billing</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Paid plans are displayed as Stripe-ready placeholders until checkout is connected.
            </p>
            <Button disabled className="mt-5">
              Billing portal coming soon
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SafetyDisclaimer />
      </div>
    </>
  );
}
