"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LogOut, Settings, UserRound } from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, getIdentityName } from "@/components/user-avatar";
import type { AppUserIdentity } from "@/lib/types";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/pricing", label: "Billing/Pricing", icon: CreditCard }
];

export function ProfileMenu({
  identity,
  className
}: {
  identity: AppUserIdentity;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = getIdentityName(identity);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 pr-2 text-left transition hover:border-primary/35 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <UserAvatar identity={identity} size="sm" />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-32 truncate text-xs font-semibold text-white">{name}</span>
          <span className="block max-w-32 truncate text-[11px] text-muted-foreground">{identity.email}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180 text-primary")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur"
        >
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <UserAvatar identity={identity} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{name}</p>
                <Badge className="border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {identity.planType}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{identity.email}</p>
            </div>
          </div>

          <div className="mt-2 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-white/10 hover:text-white"
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4 text-red-300" />
                Log out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
