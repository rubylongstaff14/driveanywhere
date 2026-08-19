"use client";

import { usePathname } from "next/navigation";
import { getAppEnv } from "@/lib/config/env";
import { Badge } from "@/components/ui/badge";

export function ConditionalModeBanner() {
  const pathname = usePathname();
  if (pathname.startsWith("/play/")) {
    return null;
  }

  const env = getAppEnv();
  if (env.mode !== "mock") {
    return null;
  }

  return (
    <div className="border-b border-amber-400/20 bg-amber-400/5">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-xs text-amber-100/90 sm:px-6">
        <Badge tone="warning">Mock mode</Badge>
        <p>
          Supabase is not configured. Routes and leaderboards use local sample
          data. The site still works for development.
        </p>
      </div>
    </div>
  );
}
