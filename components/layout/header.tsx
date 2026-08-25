"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { AuthNav, AuthNavMobile } from "@/components/auth/auth-nav";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/play/online", label: "Play Online", hot: true },
  { href: "/routes", label: "Solo" },
  { href: "/garage", label: "Garage" },
  { href: "/shop", label: "Shop" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hideChrome = pathname.startsWith("/play/");

  if (hideChrome) {
    return null;
  }

  return (
    <header className="border-line/60 bg-ink-950/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm tracking-wide transition-colors",
                  active
                    ? "bg-white/8 text-white"
                    : "text-fog hover:bg-white/5 hover:text-white",
                  "focus-visible:ring-accent focus-visible:ring-offset-ink-950 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                )}
              >
                {item.hot && (
                  <Zap className="text-accent h-3 w-3" aria-hidden />
                )}
                {item.label}
                {item.hot && (
                  <span className="absolute -top-1 -right-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <AuthNav />

        <button
          type="button"
          className="border-line text-fog focus-visible:ring-accent inline-flex h-10 w-10 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-line bg-ink-950 border-t px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-white/8 text-white"
                    : "text-fog hover:bg-panel hover:text-white",
                )}
                onClick={() => setOpen(false)}
              >
                {item.hot && (
                  <Zap className="text-accent h-3.5 w-3.5" aria-hidden />
                )}
                {item.label}
              </Link>
            ))}
            <AuthNavMobile onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
