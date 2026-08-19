import { cn } from "@/lib/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "warning" | "success";
}

const toneClasses = {
  neutral: "bg-panel-elevated text-mist border-line",
  accent: "bg-accent/15 text-accent-bright border-accent/30",
  warning: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  success: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
} as const;

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium tracking-[0.14em] uppercase",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
