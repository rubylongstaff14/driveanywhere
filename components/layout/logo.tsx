import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group font-display inline-flex items-baseline gap-0.5 text-lg tracking-tight text-white",
        "focus-visible:ring-accent focus-visible:ring-offset-ink-950 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      aria-label="DriveAnywhere.ai home"
    >
      <span className="group-hover:text-accent-bright transition-colors">
        DriveAnywhere
      </span>
      <span className="text-accent">.ai</span>
    </Link>
  );
}
