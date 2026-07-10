import { describe, expect, it } from "vitest";
import { compareVersions, parseMavenRange, versionMatchesRange } from "./versionRange.js";

describe("compareVersions", () => {
  it("compares dotted numeric versions numerically, not lexically", () => {
    expect(compareVersions("1.9", "1.10")).toBeLessThan(0);
    expect(compareVersions("1.21.4", "1.21.11")).toBeLessThan(0);
    expect(compareVersions("1.21", "1.21")).toBe(0);
  });

  it("compares versions with a shared build-metadata suffix", () => {
    expect(compareVersions("0.92.0+1.21.4", "0.100.0+1.21.4")).toBeLessThan(0);
  });

  it("treats a shorter version as less when it's a prefix of the other", () => {
    expect(compareVersions("1.21", "1.21.1")).toBeLessThan(0);
  });
});

describe("parseMavenRange", () => {
  it("parses an exact version range", () => {
    expect(parseMavenRange("[1.21.4]")).toEqual({
      lowerBound: "1.21.4",
      upperBound: "1.21.4",
      lowerInclusive: true,
      upperInclusive: true,
    });
  });

  it("parses an open-ended range", () => {
    expect(parseMavenRange("[1.21,)")).toEqual({
      lowerBound: "1.21",
      upperBound: undefined,
      lowerInclusive: true,
      upperInclusive: false,
    });
  });

  it("parses an exclusive-upper range", () => {
    expect(parseMavenRange("[1.21,1.22)")).toEqual({
      lowerBound: "1.21",
      upperBound: "1.22",
      lowerInclusive: true,
      upperInclusive: false,
    });
  });

  it("parses an inclusive-upper range", () => {
    expect(parseMavenRange("[1.21,1.22]")).toEqual({
      lowerBound: "1.21",
      upperBound: "1.22",
      lowerInclusive: true,
      upperInclusive: true,
    });
  });

  it("returns null for an unrecognized range", () => {
    expect(parseMavenRange("(1.21,1.22)")).toBeNull();
    expect(parseMavenRange("not-a-range")).toBeNull();
  });
});

describe("versionMatchesRange", () => {
  it("respects exclusive upper bounds", () => {
    const range = parseMavenRange("[1.21,1.22)")!;
    expect(versionMatchesRange("1.21", range)).toBe(true);
    expect(versionMatchesRange("1.21.9", range)).toBe(true);
    expect(versionMatchesRange("1.22", range)).toBe(false);
  });

  it("respects inclusive upper bounds", () => {
    const range = parseMavenRange("[1.21,1.22]")!;
    expect(versionMatchesRange("1.22", range)).toBe(true);
  });

  it("supports an open-ended upper bound", () => {
    const range = parseMavenRange("[1.21,)")!;
    expect(versionMatchesRange("99.0", range)).toBe(true);
    expect(versionMatchesRange("1.20", range)).toBe(false);
  });
});
