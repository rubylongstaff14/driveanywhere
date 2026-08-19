import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppEnv, isMockMode } from "@/lib/config/env";

describe("getAppEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to mock mode when Supabase vars are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const env = getAppEnv();

    expect(env.mode).toBe("mock");
    expect(env.isSupabaseConfigured).toBe(false);
    expect(isMockMode()).toBe(true);
  });

  it("enters supabase mode when both public vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const env = getAppEnv();

    expect(env.mode).toBe("supabase");
    expect(env.isSupabaseConfigured).toBe(true);
    expect(env.supabaseUrl).toBe("https://example.supabase.co");
  });

  it("uses localhost app URL by default", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const env = getAppEnv();
    expect(env.appUrl).toBe("http://localhost:3000");
  });
});
