import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";

const variantClasses = {
  primary:
    "bg-accent text-ink-950 hover:bg-accent-bright focus-visible:ring-accent",
  secondary:
    "bg-panel-elevated text-fog border border-line hover:border-fog/40 hover:bg-panel",
  ghost: "text-fog hover:bg-panel-elevated hover:text-white",
  danger: "bg-signal/15 text-signal border border-signal/40 hover:bg-signal/25",
} as const;

const sizeClasses = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-wide transition-colors",
        "focus-visible:ring-offset-ink-950 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
