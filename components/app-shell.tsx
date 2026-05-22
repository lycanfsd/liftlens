import { Logo } from "@/components/logo";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { NavBar } from "@/components/nav-bar";

export function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <NavBar userEmail={userEmail} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-background/82 px-4 py-3 backdrop-blur lg:hidden">
            <Logo />
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
