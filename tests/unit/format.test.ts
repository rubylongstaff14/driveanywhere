import { describe, expect, it } from "vitest";
import {
  formatDistance,
  formatDuration,
  formatLapTime,
} from "@/lib/utils/format";

describe("format helpers", () => {
  it("formats distance in metres and kilometres", () => {
    expect(formatDistance(720)).toBe("720 m");
    expect(formatDistance(1100)).toBe("1.1 km");
    expect(formatDistance(1000)).toBe("1 km");
  });

  it("formats durations", () => {
    expect(formatDuration(75)).toBe("1m 15s");
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats lap times", () => {
    expect(formatLapTime(null)).toBe("—");
    expect(formatLapTime(68420)).toBe("1:08.420");
  });
});
