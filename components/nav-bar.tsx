"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Dumbbell,
  History,
  Home,
  LifeBuoy,
  LogOut,
  MessageCircle,
  RotateCcw,
  Settings,
  Target
} from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UpgradeCard } from "@/components/upgrade-card";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/recovery", label: "Recovery", icon: RotateCcw },
  { href: "/weak-points", label: "Weak points", icon: Target },
  { href: "/history", label: "History", icon: History },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function NavBar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-black/30 p-5 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Logo />
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white/10 hover:text-white",
                active && "bg-white/10 text-white"
              )}
            >
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <BarChart3 className="h-4 w-4 text-accent" />
          Today&apos;s plan fits today&apos;s life.
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Adjust time, energy, soreness, equipment, and crowding before every session.
        </p>
      </div>
      <div className="mt-auto space-y-4">
        <UpgradeCard />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <form action={logoutAction} className="mt-3">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </form>
        </div>
        <Link href="/pricing" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white">
          <LifeBuoy className="h-3.5 w-3.5" />
          Pricing and support
        </Link>
      </div>
    </aside>
  );
}

export { navItems };
