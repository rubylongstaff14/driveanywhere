"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap, Trophy, Flame, Users, Car, ChevronDown } from "lucide-react";
import { useState } from "react";
import { AuthNav, AuthNavMobile } from "@/components/auth/auth-nav";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils/cn";

const navGroups = [
  {
    label: "Play",
    icon: Zap,
    color: "text-accent",
    hot: true,
    items: [
      { href: "/play/online", label: "Online Multiplayer", desc: "Race friends in live rooms", hot: true },
      { href: "/routes", label: "Solo Time Trial", desc: "Chase your personal best" },
      { href: "/hot-lap", label: "Daily Hot Lap", desc: "One attempt. No retries." },
    ],
  },
  {
    label: "Compete",
    icon: Trophy,
    color: "text-amber-400",
    items: [
      { href: "/tournament", label: "Tournament", desc: "Coin buy-in, 3 maps, winner takes pot" },
      { href: "/leaderboard", label: "Leaderboard", desc: "Weekly prizes + Hall of Fame" },
    ],
  },
  {
    label: "Garage",
    icon: Car,
    color: "text-sky-300",
    items: [
      { href: "/garage", label: "My Garage", desc: "Cars, paints, aero parts" },
      { href: "/shop", label: "Shop", desc: "Crates, coin packs" },
    ],
  },
  {
    label: "Profile",
    icon: Users,
    color: "text-violet-300",
    items: [
      { href: "/profile", label: "My Profile", desc: "Stats, achievements, PBs" },
      { href: "/leaderboard", label: "Rankings", desc: "Where you stand globally" },
    ],
  },
];

const quickLinks = [
  { href: "/play/online", label: "Play Online", hot: true },
  { href: "/tournament", label: "Tournament" },
  { href: "/hot-lap", label: "Hot Lap" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/garage", label: "Garage" },
  { href: "/profile", label: "Profile" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const hideChrome = pathname.startsWith("/play/");

  if (hideChrome) return null;

  return (
    <header className="border-line/60 bg-ink-950/92 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {quickLinks.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium tracking-wide transition-colors",
                  active ? "bg-white/8 text-white" : "text-fog hover:bg-white/5 hover:text-white",
                  "focus-visible:ring-accent focus-visible:ring-offset-ink-950 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                )}
              >
                {item.hot && <Zap className="text-accent h-3 w-3" aria-hidden />}
                {item.label}
                {item.hot && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AuthNav />
          <button
            type="button"
            className="border-line text-fog focus-visible:ring-accent inline-flex h-10 w-10 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div
          id="mobile-nav"
          className="border-line bg-ink-950 border-t px-4 py-4 lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navGroups.map((group) => (
              <div key={group.label}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white"
                  onClick={() => setDropdown(dropdown === group.label ? null : group.label)}
                >
                  <span className="flex items-center gap-2">
                    <group.icon className={`h-4 w-4 ${group.color}`} />
                    {group.label}
                    {group.hot && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    )}
                  </span>
                  <ChevronDown
                    className={cn("text-fog h-4 w-4 transition-transform", dropdown === group.label && "rotate-180")}
                  />
                </button>
                {dropdown === group.label && (
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-white/8 pl-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm transition-colors",
                          pathname === item.href ? "bg-white/8 text-white" : "text-fog hover:text-white",
                        )}
                      >
                        <p className="font-medium">{item.label}</p>
                        <p className="text-fog/60 text-xs">{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-line mt-2 border-t pt-2">
              <AuthNavMobile onNavigate={() => setOpen(false)} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
