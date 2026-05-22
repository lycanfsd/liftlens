import Link from "next/link";

import { loginAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute left-5 top-5">
        <Logo />
      </div>
      <div className="absolute inset-0 -z-10 surface-line opacity-25" />
      <div className="w-full max-w-md">
        <AuthForm mode="login" action={loginAction} nextPath={params.next} />
        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing, you agree to use FlexFit AI as planning support, not medical advice.{" "}
          <Link href="/" className="text-white hover:text-primary">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
