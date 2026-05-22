import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  icon?: LucideIcon;
  accent?: "green" | "blue" | "silver";
};

export function StatCard({ label, value, detail, trend, icon: Icon, accent = "green" }: StatCardProps) {
  const accentClass = {
    green: "bg-primary/12 text-primary",
    blue: "bg-accent/12 text-accent",
    silver: "bg-white/10 text-white"
  }[accent];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
          {Icon ? (
            <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", accentClass)}>
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{detail}</span>
          {trend ? <span className="font-semibold text-primary">{trend}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
