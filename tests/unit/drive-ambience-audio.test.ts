import { describe, expect, it } from "vitest";
import { DriveAmbienceAudio } from "@/lib/game/drive-ambience-audio";

describe("DriveAmbienceAudio", () => {
  it("exposes scrub/wind update API", () => {
    const audio = new DriveAmbienceAudio();
    expect(typeof audio.update).toBe("function");
    expect(typeof audio.ensureStarted).toBe("function");
    audio.dispose();
  });
});
