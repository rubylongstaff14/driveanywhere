"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProgressionStore } from "@/stores/progression-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrateProgression = useProgressionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    hydrateProgression();
  }, [hydrate, hydrateProgression]);

  return children;
}
