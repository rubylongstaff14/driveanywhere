import { describe, expect, it, vi } from "vitest";

describe("RaceAudio API", () => {
  it("exposes checkpoint and finish cues", async () => {
    vi.resetModules();
    const { RaceAudio } = await import("@/lib/game/race-audio");
    const audio = new RaceAudio();
    expect(typeof audio.playCheckpoint).toBe("function");
    expect(typeof audio.playFinish).toBe("function");
    audio.dispose();
  });
});
