import Link from "next/link";
import { AlertTriangle, LogIn, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.message ??
    "We could not confirm your account with that link. It may have expired or already been used.";

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute left-5 top-5">
        <Logo />
      </div>
      <div className="absolute inset-0 -z-10 surface-line opacity-25" />
      <Card className="w-full max-w-md border-destructive/30 bg-black/55">
        <CardContent className="p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-red-200">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-white">Confirmation did not work.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
          <div className="mt-6 grid gap-3">
            <Button asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Back to login
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">
                <Mail className="h-4 w-4" />
                Send a new confirmation link
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
