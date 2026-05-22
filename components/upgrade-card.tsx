import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UpgradeCard() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" />
        Pro preview
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Unlock deeper AI coaching, meal ideas, and smarter recovery rules.
      </p>
      <Button asChild size="sm" className="mt-4 w-full">
        <Link href="/pricing">View plans</Link>
      </Button>
    </div>
  );
}
