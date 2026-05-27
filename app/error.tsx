"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/brand";

export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute left-5 top-5">
        <Logo variant="compact" size="sm" />
      </div>
      <Card className="w-full max-w-lg border-destructive/30 bg-black/55">
        <CardContent className="p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-red-200">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-white">Something needs a reset.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {APP_NAME} hit an unexpected error. Try again, or return home and restart the flow.
          </p>
          {error.digest ? (
            <p className="mt-3 rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-muted-foreground">
              Error reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
