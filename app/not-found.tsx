import Link from "next/link";
import { Compass, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute left-5 top-5">
        <Logo />
      </div>
      <Card className="w-full max-w-lg bg-black/55">
        <CardContent className="p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Compass className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-white">This route is not in the plan.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The page may have moved, or the workout path you opened is no longer available.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to FlexFit
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
