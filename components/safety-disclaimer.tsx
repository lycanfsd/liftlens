import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function SafetyDisclaimer() {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardContent className="flex gap-3 p-4">
        <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm leading-6 text-muted-foreground">
          FlexFit AI is not medical advice. Consult a physician before starting an exercise program,
          especially if you have a medical condition, injury, or are returning after a long break. Stop
          exercising and seek care if you experience chest pain, severe dizziness, unusual shortness of
          breath, or injury symptoms.
        </p>
      </CardContent>
    </Card>
  );
}
