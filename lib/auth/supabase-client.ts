import { getAppEnv } from "@/lib/config/env";

/**
 * Supabase browser client stub.
 * Full @supabase/supabase-js wiring lands when you enable Supabase later.
 * This keeps imports safe and centralised without requiring env vars.
 */
export interface SupabaseBrowserClientStub {
  configured: false;
  reason: string;
}

export function createSupabaseBrowserClient(): SupabaseBrowserClientStub | null {
  const env = getAppEnv();
  if (!env.isSupabaseConfigured) {
    return null;
  }

  // Intentionally not instantiating a real client yet.
  // When ready: install @supabase/supabase-js and createBrowserClient here.
  console.info(
    "[auth] Supabase env detected, but live auth is deferred. Using mock auth until enabled.",
  );
  return {
    configured: false,
    reason:
      "Supabase packages/auth handlers are reserved for a later milestone.",
  };
}

export function isSupabaseAuthReady(): boolean {
  return false;
}
