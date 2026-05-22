import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  label,
  className
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0" x2="1">
            <stop stopColor="#22c55e" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-semibold text-white">{value}%</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
