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

export const statCardTextStyles = {
  label: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  value:
    "mt-2 whitespace-normal break-words [overflow-wrap:anywhere] text-xl font-semibold leading-tight text-white sm:text-2xl",
  detail: "whitespace-normal break-words [overflow-wrap:anywhere] text-muted-foreground",
  trend: "whitespace-normal break-words [overflow-wrap:anywhere] font-semibold text-primary"
};

export function StatCard({ label, value, detail, trend, icon: Icon, accent = "green" }: StatCardProps) {
  const accentClass = {
    green: "bg-primary/12 text-primary",
    blue: "bg-accent/12 text-accent",
    silver: "bg-white/10 text-white"
  }[accent];

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="min-w-0 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={statCardTextStyles.label}>{label}</p>
            <p className={statCardTextStyles.value}>{value}</p>
          </div>
          {Icon ? (
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", accentClass)}>
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className={cn(statCardTextStyles.detail, "min-w-0 flex-1")}>{detail}</span>
          {trend ? <span className={cn(statCardTextStyles.trend, "sm:max-w-[45%] sm:text-right")}>{trend}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
