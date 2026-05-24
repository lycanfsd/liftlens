"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, History, Home, Lock, MessageCircle, Target, UserRound, Video } from "lucide-react";

import { isPaidPlan } from "@/lib/plans";
import type { AppUserIdentity } from "@/lib/types";
import { cn } from "@/lib/utils";

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/form-coach", label: "Form", icon: Video, proOnly: true },
  { href: "/weak-points", label: "Focus", icon: Target },
  { href: "/history", label: "History", icon: History },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function MobileBottomNav({ userIdentity }: { userIdentity: AppUserIdentity }) {
  const pathname = usePathname();
  const hasFormCoachAccess = isPaidPlan(userIdentity.planType);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-7 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        const active = pathname === item.href;
        const locked = item.proOnly && !hasFormCoachAccess;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "grid place-items-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-medium text-muted-foreground",
              active && "bg-white/10 text-white"
            )}
          >
            <span className="relative">
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              {locked ? (
                <span className="absolute -right-2 -top-2 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
