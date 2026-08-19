"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

interface RequireAuthProps {
  children: React.ReactNode;
  allowGuest?: boolean;
}

export function RequireAuth({
  children,
  allowGuest = true,
}: RequireAuthProps) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowGuest && user.mode === "guest") {
      router.replace("/register");
    }
  }, [allowGuest, hydrated, router, user]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-mist sm:px-6">
        Loading account…
      </div>
    );
  }

  if (!user || (!allowGuest && user.mode === "guest")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-mist sm:px-6">
        Redirecting…
      </div>
    );
  }

  return children;
}
