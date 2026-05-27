import Image from "next/image";

type UlvoriLogoProps = {
  variant?: "icon" | "mark" | "horizontal" | "compact" | "sidebar";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { icon: 32, mark: 32, horizontal: 150, compact: 120, sidebar: 40 },
  md: { icon: 44, mark: 44, horizontal: 220, compact: 170, sidebar: 44 },
  lg: { icon: 64, mark: 64, horizontal: 320, compact: 240, sidebar: 56 }
};

const assetForVariant = {
  icon: "/brand/ulvori-app-icon-512.png",
  mark: "/brand/ulvori-mark-transparent.png",
  horizontal: "/brand/ulvori-logo-horizontal-transparent.png",
  compact: "/brand/ulvori-compact-logo-transparent.png"
};

export function UlvoriLogo({
  variant = "horizontal",
  size = "md",
  className = ""
}: UlvoriLogoProps) {
  if (variant === "sidebar") {
    return (
      <span className={`flex items-center gap-3 ${className}`}>
        <Image
          src="/brand/ulvori-app-icon-64.png"
          alt="Ulvori wolf U icon"
          width={sizes[size].sidebar}
          height={sizes[size].sidebar}
          className="shrink-0 rounded-xl object-contain"
          priority
        />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-base font-semibold text-white">Ulvori</span>
          <span className="block truncate text-xs text-muted-foreground">Adaptive fitness coach</span>
        </span>
      </span>
    );
  }

  const src = assetForVariant[variant];
  const width = sizes[size][variant];
  const height = variant === "horizontal" ? Math.round(width * 0.25) : variant === "compact" ? Math.round(width * 0.33) : width;

  return (
    <Image
      src={src}
      alt={variant === "icon" || variant === "mark" ? "Ulvori wolf U icon" : "Ulvori logo"}
      width={width}
      height={height}
      className={`h-auto object-contain ${className}`}
      priority={variant === "compact" || variant === "horizontal"}
    />
  );
}

export default UlvoriLogo;
