import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readGradleProperty } from "../src/lib/gradleProperties.js";

const fixture = fileURLToPath(new URL("./fixtures/gradle.properties", import.meta.url));

describe("readGradleProperty", () => {
  it("reads a known key", () => {
    expect(readGradleProperty(fixture, "minecraft_version")).toBe("1.21.4");
    expect(readGradleProperty(fixture, "minecraft_version_range")).toBe("[1.21,1.22)");
    expect(readGradleProperty(fixture, "java_version")).toBe("21");
  });

  it("returns undefined for a missing key", () => {
    expect(readGradleProperty(fixture, "does_not_exist")).toBeUndefined();
  });
});
