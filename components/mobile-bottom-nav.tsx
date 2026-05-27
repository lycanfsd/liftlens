"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Dumbbell, Home, MessageCircle, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: Home, tourId: "sidebar-dashboard" },
  { href: "/workout", label: "Today", icon: Dumbbell, tourId: "today-nav" },
  { href: "/progress", label: "Progress", icon: BarChart3, tourId: "progress-nav" },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tourId}
            className={cn(
              "grid place-items-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-medium text-muted-foreground",
              active && "bg-white/10 text-white"
            )}
          >
            <span className="relative">
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
