import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-3", className)} aria-label="FlexFit AI home">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-green">
        FF
      </span>
      <span className="leading-tight">
        <span className="block text-base font-semibold text-white">FlexFit AI</span>
        <span className="block text-xs text-muted-foreground">Adaptive fitness coach</span>
      </span>
    </Link>
  );
}
