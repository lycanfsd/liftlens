import { Suspense } from "react";

import { GuidedWalkthrough } from "@/components/guided-walkthrough";
import { Logo } from "@/components/logo";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NavBar } from "@/components/nav-bar";
import { ProfileMenu } from "@/components/profile-menu";
import { Badge } from "@/components/ui/badge";
import type { AppUserIdentity } from "@/lib/types";

export function AppShell({
  children,
  userIdentity
}: {
  children: React.ReactNode;
  userIdentity: AppUserIdentity;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <NavBar userIdentity={userIdentity} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-background/82 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <Logo className="lg:hidden [&>span:last-child>span:last-child]:hidden sm:[&>span:last-child>span:last-child]:block" />
              <div className="hidden min-w-0 lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">FlexFit AI</p>
                <p className="mt-1 text-sm text-muted-foreground">Today&apos;s plan fits today&apos;s life.</p>
              </div>
              <div className="flex items-center gap-2">
                {userIdentity.devPremiumEnabled ? (
                  <Badge className="border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                    Dev Premium Enabled
                  </Badge>
                ) : null}
                <ProfileMenu identity={userIdentity} />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav userIdentity={userIdentity} />
      <Suspense fallback={null}>
        <GuidedWalkthrough userId={userIdentity.userId} />
      </Suspense>
    </div>
  );
}
