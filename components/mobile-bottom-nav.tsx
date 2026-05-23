"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, History, Home, MessageCircle, Target, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/weak-points", label: "Focus", icon: Target },
  { href: "/history", label: "History", icon: History },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "grid place-items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-muted-foreground",
              active && "bg-white/10 text-white"
            )}
          >
            <item.icon className={cn("h-4 w-4", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
