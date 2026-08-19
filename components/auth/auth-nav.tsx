"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useAuthStore } from "@/stores/auth-store";

export function AuthNav() {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!hydrated) {
    return (
      <div className="hidden h-9 w-40 animate-pulse rounded-md bg-panel md:block" />
    );
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-3 md:flex">
        <ButtonLink href="/login" variant="ghost" size="sm">
          Log in
        </ButtonLink>
        <ButtonLink href="/register" variant="primary" size="sm">
          Create account
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 md:flex">
      <Link
        href="/profile"
        className="text-sm text-mist transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {user.displayName}
      </Link>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          logout();
          router.push("/");
        }}
      >
        Log out
      </Button>
    </div>
  );
}

export function AuthNavMobile({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!hydrated) {
    return null;
  }

  if (!user) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <ButtonLink
          href="/login"
          variant="secondary"
          size="sm"
          onClick={onNavigate}
        >
          Log in
        </ButtonLink>
        <ButtonLink
          href="/register"
          variant="primary"
          size="sm"
          onClick={onNavigate}
        >
          Create account
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <ButtonLink href="/profile" variant="secondary" size="sm" onClick={onNavigate}>
        Profile
      </ButtonLink>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          logout();
          onNavigate?.();
          router.push("/");
        }}
      >
        Log out
      </Button>
    </div>
  );
}
