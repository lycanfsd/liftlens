import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingState({ label = "Adapting your plan", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label}
    </div>
  );
}
