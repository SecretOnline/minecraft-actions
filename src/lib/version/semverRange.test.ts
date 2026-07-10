import { describe, expect, it } from "vitest";
import {
  normalizeRangeForNpmSemver,
  stripBuildMetadata,
  versionSatisfiesAllRanges,
  versionSatisfiesRange,
} from "./semverRange.js";

describe("stripBuildMetadata", () => {
  it("removes a +build suffix", () => {
    expect(stripBuildMetadata("0.8.12+mc1.21.11")).toBe("0.8.12");
  });

  it("leaves a version with no build metadata unchanged", () => {
    expect(stripBuildMetadata("0.8.12")).toBe("0.8.12");
  });
});

describe("normalizeRangeForNpmSemver", () => {
  it("inserts an explicit 0 after a trailing dash before a space, pipe, or end of string", () => {
    expect(normalizeRangeForNpmSemver(">=1.0.0-")).toBe(">=1.0.0-0");
    expect(normalizeRangeForNpmSemver(">=1.0.0- <2.0.0")).toBe(">=1.0.0-0 <2.0.0");
    expect(normalizeRangeForNpmSemver(">=1.0.0- || >=2.0.0-")).toBe(">=1.0.0-0 || >=2.0.0-0");
  });

  it("leaves a range with no bare trailing dash unchanged", () => {
    expect(normalizeRangeForNpmSemver(">=0.6.0")).toBe(">=0.6.0");
  });
});

describe("versionSatisfiesRange", () => {
  it("matches the real Voxy -> Sodium shape (build metadata + simple range)", () => {
    expect(versionSatisfiesRange("0.8.12+mc1.21.11", ">=0.6.0")).toBe(true);
    expect(versionSatisfiesRange("0.4.0+mc1.21.11", ">=0.6.0")).toBe(false);
  });

  it("matches an OR'd range from an array-valued depends entry", () => {
    expect(versionSatisfiesRange("0.15.0", "<0.15 || >=0.16")).toBe(false);
    expect(versionSatisfiesRange("0.16.0", "<0.15 || >=0.16")).toBe(true);
  });

  it("matches a bare-trailing-dash prerelease range", () => {
    expect(versionSatisfiesRange("1.0.0-beta.1", ">=1.0.0-")).toBe(true);
  });
});

describe("versionSatisfiesAllRanges", () => {
  it("requires every declared range to be satisfied", () => {
    expect(versionSatisfiesAllRanges("0.8.12", [">=0.6.0", "<1.0.0"])).toBe(true);
    expect(versionSatisfiesAllRanges("0.8.12", [">=0.6.0", "<0.8.0"])).toBe(false);
  });

  it("returns true for an empty range list", () => {
    expect(versionSatisfiesAllRanges("0.8.12", [])).toBe(true);
  });
});
