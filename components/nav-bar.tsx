"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Dumbbell,
  History,
  Home,
  LifeBuoy,
  Lock,
  MessageCircle,
  UserRound,
  RotateCcw,
  Settings,
  Target,
  Video
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { UpgradeCard } from "@/components/upgrade-card";
import { UserAvatar, getIdentityName } from "@/components/user-avatar";
import type { AppUserIdentity } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/form-coach", label: "Form Coach", icon: Video, proOnly: true },
  { href: "/recovery", label: "Recovery", icon: RotateCcw },
  { href: "/weak-points", label: "Weak points", icon: Target },
  { href: "/history", label: "History", icon: History },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function NavBar({ userIdentity }: { userIdentity: AppUserIdentity }) {
  const pathname = usePathname();
  const name = getIdentityName(userIdentity);
  const hasFormCoachAccess = userIdentity.hasPremiumAccess;

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-black/30 p-5 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Logo />
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const locked = item.proOnly && !hasFormCoachAccess;
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
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {locked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  <Lock className="h-3 w-3" />
                  Pro
                </span>
              ) : null}
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
        <Link
          href="/profile"
          className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-primary/35 hover:bg-white/[0.07]"
        >
          <UserAvatar identity={userIdentity} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <Badge className="border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {userIdentity.planType}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{userIdentity.email}</p>
          </div>
        </Link>
        <Link href="/pricing" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white">
          <LifeBuoy className="h-3.5 w-3.5" />
          Pricing and support
        </Link>
      </div>
    </aside>
  );
}

export { navItems };
