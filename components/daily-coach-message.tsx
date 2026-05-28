"use client";

import { ArrowRight, Loader2, Lock, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalDateKey } from "@/lib/dates";

type DailyCoachApiMessage = {
  id: string;
  messageDate: string;
  content: string;
  source: "fake" | "openai" | "fallback";
  planType: "Free" | "Pro" | "Elite";
  dismissedAt: string | null;
  createdAt: string;
};

type DailyCoachApiResponse = {
  message?: DailyCoachApiMessage;
  gated?: boolean;
  error?: string;
};

type Status = "loading" | "ready" | "gated" | "error" | "dismissed";

function getSourceLabel(source: DailyCoachApiMessage["source"]) {
  if (source === "fake") return "DEV_FAKE_AI";
  if (source === "fallback") return "Fallback";
  return "AI";
}

function getClientDateKey() {
  return getLocalDateKey();
}

export function DailyCoachMessage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<DailyCoachApiMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDailyMessage() {
      try {
        const response = await fetch(`/api/coach/daily?date=${getClientDateKey()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as DailyCoachApiResponse | null;

        if (!isMounted) return;

        if (response.status === 403 && payload?.gated) {
          setError(payload.error ?? "Daily AI Coach Message is a Pro feature.");
          setStatus("gated");
          return;
        }

        if (!response.ok || !payload?.message) {
          setError(payload?.error ?? "Daily coach message is not available right now.");
          setStatus("error");
          return;
        }

        if (payload.message.dismissedAt) {
          setStatus("dismissed");
          return;
        }

        setMessage(payload.message);
        setStatus("ready");
      } catch {
        if (!isMounted) return;
        setError("Daily coach message is taking a rest set. Try again in a moment.");
        setStatus("error");
      }
    }

    void loadDailyMessage();

    return () => {
      isMounted = false;
    };
  }, []);

  async function dismissMessage() {
    setIsDismissing(true);
    setError(null);

    try {
      const response = await fetch("/api/coach/daily", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", messageDate: message?.messageDate ?? getClientDateKey() })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as DailyCoachApiResponse | null;
        setError(payload?.error ?? "We could not dismiss this message yet.");
        setIsDismissing(false);
        return;
      }

      setStatus("dismissed");
    } catch {
      setError("We could not dismiss this message yet.");
      setIsDismissing(false);
    }
  }

  if (status === "dismissed") return null;

  if (status === "loading") {
    return (
      <Card className="mt-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-white/[0.045] to-accent/10">
        <CardContent className="flex items-center gap-4 p-5 sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Daily AI Coach</p>
            <p className="mt-1 text-sm text-muted-foreground">Preparing today&apos;s adaptive note.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "gated") {
    return (
      <Card className="mt-6 overflow-hidden border-primary/25 bg-gradient-to-br from-primary/12 via-white/[0.045] to-accent/10">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-primary">Daily AI Coach</p>
                <Badge className="border-primary/25 bg-primary/10 text-primary">Pro</Badge>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">A fresh coach note every day.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {error ??
                  "Upgrade to Pro to unlock personalized daily coaching, habit nudges, and recovery-aware next steps."}
              </p>
            </div>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/pricing">
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="mt-6 border-white/10 bg-white/[0.035]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-muted-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Daily AI Coach</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {error ?? "Daily coach message is not available right now."}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/workout">Generate workout</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!message) return null;

  return (
    <Card className="mt-6 overflow-hidden border-primary/25 bg-gradient-to-br from-primary/14 via-white/[0.055] to-accent/10">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-primary">Daily AI Coach</p>
                <Badge className="border-primary/25 bg-primary/10 text-primary">
                  {getSourceLabel(message.source)}
                </Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Today&apos;s coaching note</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{message.content}</p>
              {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            </div>
          </div>
          <Button
            aria-label="Dismiss daily coach message"
            disabled={isDismissing}
            onClick={dismissMessage}
            size="icon"
            type="button"
            variant="ghost"
            className="self-end sm:self-start"
          >
            {isDismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
