import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function GoalBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="border-primary/20 bg-primary/10 text-primary">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {children}
    </Badge>
  );
}
