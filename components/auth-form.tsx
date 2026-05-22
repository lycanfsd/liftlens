"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail, LockKeyhole } from "lucide-react";

import type { AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthAction = (state: AuthState, formData: FormData) => Promise<AuthState>;

export function AuthForm({
  mode,
  action,
  nextPath
}: {
  mode: "login" | "signup";
  action: AuthAction;
  nextPath?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-md border-white/12 bg-black/55">
      <CardHeader>
        <CardTitle className="text-2xl">{isLogin ? "Welcome back" : "Start adapting today"}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {isLogin
            ? "Log in to keep your plan synced with real life."
            : "Create your account, then we'll tune your first plan."}
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={nextPath ?? "/dashboard"} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input id="email" name="email" type="email" required placeholder="you@example.com" className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="pl-10"
              />
            </div>
          </div>
          {state.error ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-red-200">
              {state.error}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Working..." : isLogin ? "Log in" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-muted-foreground">
          Supabase auth is ready once env vars are set. For local UI review,{" "}
          <Link href="/dashboard" className="font-semibold text-primary hover:text-primary/80">
            continue in demo mode
          </Link>
          .
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <Link href={isLogin ? "/signup" : "/login"} className="font-semibold text-white hover:text-primary">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
