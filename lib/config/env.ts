/**
 * Environment detection for mock vs Supabase modes.
 * Milestone 1 always runs in mock mode when Supabase vars are missing.
 */

export type DataMode = "mock" | "supabase";

export interface AppEnv {
  mode: DataMode;
  isSupabaseConfigured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  appUrl: string;
}

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

export function getAppEnv(): AppEnv {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  return {
    mode: isSupabaseConfigured ? "supabase" : "mock",
    isSupabaseConfigured,
    supabaseUrl,
    supabaseAnonKey,
    appUrl: readEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  };
}

export function isMockMode(): boolean {
  return getAppEnv().mode === "mock";
}
