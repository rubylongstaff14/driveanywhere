import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  usernameSchema,
} from "@/lib/validation/auth";

describe("auth validation", () => {
  it("accepts a valid username", () => {
    expect(usernameSchema.safeParse("river_fox").success).toBe(true);
  });

  it("rejects short passwords on login", () => {
    const result = loginSchema.safeParse({
      email: "a@b.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("requires matching passwords on register", () => {
    const result = registerSchema.safeParse({
      email: "a@b.com",
      username: "driver1",
      displayName: "Driver One",
      password: "password123",
      confirmPassword: "password999",
    });
    expect(result.success).toBe(false);
  });
});
