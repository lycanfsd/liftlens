import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  copy,
  actionLabel,
  href
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <Card>
      <CardContent className="grid place-items-center p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
        {actionLabel && href ? (
          <Button asChild className="mt-5">
            <a href={href}>{actionLabel}</a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
