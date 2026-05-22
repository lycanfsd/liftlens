import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  copy,
  children,
  className
}: {
  eyebrow?: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow ? <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{copy}</p>
      </div>
      {children}
    </div>
  );
}
