"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useAuthStore } from "@/stores/auth-store";

export function ProfileSummary() {
  const user = useAuthStore((state) => state.user);
  const [copied, setCopied] = useState(false);

  if (!user) {
    return null;
  }

  const profilePath = `/profile?u=${encodeURIComponent(user.username)}`;

  async function copyProfileLink() {
    try {
      const url = `${window.location.origin}${profilePath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={user.mode === "guest" ? "warning" : "accent"}>
              {user.mode === "guest" ? "Guest" : "Registered"}
            </Badge>
            {user.countryCode ? (
              <Badge tone="neutral">{user.countryCode}</Badge>
            ) : null}
          </div>
          <h1 className="font-display text-4xl text-white">
            {user.displayName}
          </h1>
          <p className="mt-2 font-mono text-sm text-fog">@{user.username}</p>
          {user.email ? (
            <p className="mt-1 text-sm text-mist">{user.email}</p>
          ) : (
            <p className="mt-1 text-sm text-mist">
              Guest sessions stay on this browser until you create an account.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={copyProfileLink}>
            {copied ? "Copied" : "Copy profile link"}
          </Button>
          <ButtonLink href="/settings" variant="ghost" size="sm">
            Settings
          </ButtonLink>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Attempts" value={String(user.totalAttempts)} />
        <Stat label="Routes completed" value={String(user.completedRoutes)} />
        <Stat
          label="Member since"
          value={new Date(user.createdAt).toLocaleDateString()}
        />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel/50 p-4">
      <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
        {label}
      </dt>
      <dd className="mt-2 text-xl text-white">{value}</dd>
    </div>
  );
}
