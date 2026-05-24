import { UserRound } from "lucide-react";

import type { AppUserIdentity } from "@/lib/types";
import { cn } from "@/lib/utils";

const avatarSizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base"
};

export function getIdentityName(identity: AppUserIdentity) {
  return identity.displayName?.trim() || identity.email.split("@")[0] || "FlexFit member";
}

export function getIdentityInitials(identity: AppUserIdentity) {
  const source = getIdentityName(identity);
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "FF";
}

export function UserAvatar({
  identity,
  size = "md",
  className
}: {
  identity: AppUserIdentity;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  const name = getIdentityName(identity);
  const initials = getIdentityInitials(identity);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-primary text-center font-black text-primary-foreground shadow-green ring-2 ring-primary/10",
        avatarSizes[size],
        className
      )}
    >
      {identity.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={identity.avatarUrl} alt={`${name} profile photo`} className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <UserRound className="h-4 w-4" />
      )}
    </span>
  );
}
