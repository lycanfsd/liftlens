import Link from "next/link";

import { signupAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/brand";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute left-5 top-5">
        <Logo variant="compact" size="sm" />
      </div>
      <div className="absolute inset-0 -z-10 surface-line opacity-25" />
      <div className="w-full max-w-md">
        <AuthForm mode="signup" action={signupAction} nextPath="/onboarding" />
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {APP_NAME} adapts training to life.{" "}
          <Link href="/" className="text-white hover:text-primary">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
