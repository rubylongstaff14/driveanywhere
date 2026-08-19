import { cn } from "@/lib/utils/cn";

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

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-wide transition-colors",
        "focus-visible:ring-offset-ink-950 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
