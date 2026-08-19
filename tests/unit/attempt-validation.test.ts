import { describe, expect, it } from "vitest";
import { validateAttemptSubmission } from "@/lib/game/attempt-validation";
import { MOCK_ROUTES } from "@/lib/database/mock/routes";

const route = MOCK_ROUTES[0];
const base = {
  routeId: route.id,
  routeSlug: route.slug,
  userId: "user-1",
  displayName: "Tester",
  isGuest: false,
  // ~75 s is plausible for a ~2 km street circuit.
  completionTimeMs: 75_000,
  checkpointCount: route.checkpointCount,
  requiredCheckpointCount: route.checkpointCount,
  isValidClient: true,
};

describe("attempt validation", () => {
  it("accepts a plausible valid run", () => {
    expect(validateAttemptSubmission(base).ok).toBe(true);
  });

  it("rejects negative times", () => {
    expect(
      validateAttemptSubmission({ ...base, completionTimeMs: -1 }).reason,
    ).toBe("Impossible negative time");
  });

  it("rejects times below the minimum", () => {
    expect(
      validateAttemptSubmission({ ...base, completionTimeMs: 1000 }).reason,
    ).toBe("Time below route minimum");
  });

  it("rejects missing checkpoints", () => {
    expect(
      validateAttemptSubmission({ ...base, checkpointCount: 1 }).reason,
    ).toBe("Missing checkpoints");
  });

  it("rejects unknown routes", () => {
    expect(
      validateAttemptSubmission({
        ...base,
        routeId: "00000000-0000-4000-8000-000000000099",
      }).reason,
    ).toBe("Unknown route");
  });
});
