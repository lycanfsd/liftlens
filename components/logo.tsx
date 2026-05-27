import Link from "next/link";

import { UlvoriLogo } from "@/components/ulvori-logo";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "icon" | "mark" | "horizontal" | "compact" | "sidebar";
  size?: "sm" | "md" | "lg";
};

export function Logo({ className, variant = "sidebar", size = "md" }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-3", className)} aria-label={`${APP_NAME} home`}>
      <UlvoriLogo variant={variant} size={size} />
    </Link>
  );
}
