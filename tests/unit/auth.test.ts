import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  continueAsGuest,
  loginMockUser,
  logoutMockUser,
  registerMockUser,
  updateMockProfile,
} from "@/lib/auth/mock-auth";
import { clearSession, writeMockUsers } from "@/lib/auth/storage";

describe("mock auth", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
    clearSession();
    writeMockUsers([]);
  });

  it("registers and logs in a user", () => {
    const registered = registerMockUser({
      email: "driver@example.com",
      username: "RiverFox",
      displayName: "River Fox",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }
    expect(registered.session.user.username).toBe("riverfox");

    logoutMockUser();

    const loggedIn = loginMockUser({
      email: "driver@example.com",
      password: "password123",
    });
    expect(loggedIn.ok).toBe(true);
  });

  it("rejects duplicate emails", () => {
    registerMockUser({
      email: "driver@example.com",
      username: "RiverFox",
      displayName: "River Fox",
      password: "password123",
      confirmPassword: "password123",
    });

    const duplicate = registerMockUser({
      email: "driver@example.com",
      username: "OtherUser",
      displayName: "Other",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(duplicate.ok).toBe(false);
  });

  it("supports guest mode", () => {
    const guest = continueAsGuest();
    expect(guest.ok).toBe(true);
    if (!guest.ok) {
      return;
    }
    expect(guest.session.user.mode).toBe("guest");
    expect(guest.session.user.email).toBeNull();
  });

  it("updates profile fields", () => {
    registerMockUser({
      email: "driver@example.com",
      username: "RiverFox",
      displayName: "River Fox",
      password: "password123",
      confirmPassword: "password123",
    });

    const updated = updateMockProfile({
      username: "ThamesPilot",
      displayName: "Thames Pilot",
      countryCode: "gb",
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      return;
    }
    expect(updated.session.user.username).toBe("thamespilot");
    expect(updated.session.user.countryCode).toBe("GB");
  });
});
