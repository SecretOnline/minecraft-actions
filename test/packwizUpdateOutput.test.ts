import { describe, expect, it } from "vitest";
import { parsePackwizUpdateLine } from "../src/lib/packwizUpdateOutput.js";

describe("parsePackwizUpdateLine", () => {
  it("parses a real mod update line (verified against a live packwiz run)", () => {
    const line = "Sodium: sodium-fabric-0.5.11+mc1.21.jar -> sodium-fabric-0.8.12+mc1.21.1.jar";
    expect(parsePackwizUpdateLine(line)).toEqual({
      mod: { name: "Sodium", oldFile: "sodium-fabric-0.5.11+mc1.21.jar", newFile: "sodium-fabric-0.8.12+mc1.21.1.jar" },
    });
  });

  it("parses a real loader update line (verified against a live packwiz run)", () => {
    expect(parsePackwizUpdateLine("Updated Fabric loader to version 0.19.3")).toEqual({
      loader: { name: "Fabric", version: "0.19.3" },
    });
  });

  it("ignores unrelated chatter and progress output", () => {
    expect(parsePackwizUpdateLine("Loading modpack...")).toBeUndefined();
    expect(parsePackwizUpdateLine("Checking for updates...")).toBeUndefined();
    expect(parsePackwizUpdateLine("All files are up to date!")).toBeUndefined();
    expect(parsePackwizUpdateLine("Refreshing index... 0 % [---------]")).toBeUndefined();
  });
});
