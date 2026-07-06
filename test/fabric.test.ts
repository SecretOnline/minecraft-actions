import { describe, expect, it } from "vitest";
import { buildFabricServerJarUrl, findLatestStableFabricVersion } from "../src/lib/fabric.js";

describe("findLatestStableFabricVersion", () => {
  it("returns the first stable entry", () => {
    const versions = [
      { version: "0.19.4", stable: false },
      { version: "0.19.3", stable: true },
      { version: "0.19.2", stable: true },
    ];
    expect(findLatestStableFabricVersion(versions)).toBe("0.19.3");
  });

  it("returns undefined when nothing is stable", () => {
    expect(findLatestStableFabricVersion([{ version: "0.19.4", stable: false }])).toBeUndefined();
  });
});

describe("buildFabricServerJarUrl", () => {
  it("builds the meta.fabricmc.net server jar URL", () => {
    expect(buildFabricServerJarUrl("26.2", "0.19.3", "1.1.1")).toBe(
      "https://meta.fabricmc.net/v2/versions/loader/26.2/0.19.3/1.1.1/server/jar",
    );
  });
});
