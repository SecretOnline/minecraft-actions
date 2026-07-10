import { describe, expect, it } from "vitest";
import {
  buildFabricLibraryUrl,
  buildFabricServerJarUrl,
  findLatestStableFabricVersion,
  mavenCoordinateToPath,
  parseFabricModJson,
} from "./fabric.js";

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

describe("mavenCoordinateToPath", () => {
  it("converts group:artifact:version to a maven repo layout path", () => {
    expect(mavenCoordinateToPath("org.ow2.asm:asm:9.10.1")).toBe("org/ow2/asm/asm/9.10.1/asm-9.10.1.jar");
  });

  it("includes a classifier suffix when present", () => {
    expect(mavenCoordinateToPath("org.lwjgl:lwjgl:3.4.1:natives-linux")).toBe(
      "org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-natives-linux.jar",
    );
  });
});

describe("buildFabricLibraryUrl", () => {
  it("joins the library's repo base with the coordinate path", () => {
    expect(
      buildFabricLibraryUrl({ name: "net.fabricmc:fabric-loader:0.19.3", url: "https://maven.fabricmc.net/" }),
    ).toBe("https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.19.3/fabric-loader-0.19.3.jar");
  });

  it("adds a missing trailing slash to the repo base", () => {
    expect(buildFabricLibraryUrl({ name: "org.ow2.asm:asm:9.10.1", url: "https://maven.fabricmc.net" })).toBe(
      "https://maven.fabricmc.net/org/ow2/asm/asm/9.10.1/asm-9.10.1.jar",
    );
  });
});

describe("parseFabricModJson", () => {
  it("parses id, version, and a single-range depends entry", () => {
    const json = JSON.stringify({
      id: "voxy",
      version: "0.2.16-beta+1.21.11",
      depends: { sodium: ">=0.6.0" },
    });
    expect(parseFabricModJson(json)).toEqual({
      id: "voxy",
      version: "0.2.16-beta+1.21.11",
      depends: { sodium: ">=0.6.0" },
    });
  });

  it("joins array-valued depends ranges with || , matching the prior jq normalisation", () => {
    const json = JSON.stringify({
      id: "example",
      version: "1.0.0",
      depends: { fabricloader: ["<0.15", ">=0.16"] },
    });
    expect(parseFabricModJson(json).depends).toEqual({
      fabricloader: "<0.15 || >=0.16",
    });
  });

  it("defaults to an empty depends object when absent", () => {
    const json = JSON.stringify({ id: "example", version: "1.0.0" });
    expect(parseFabricModJson(json).depends).toEqual({});
  });

  it("throws on missing id or version", () => {
    expect(() => parseFabricModJson(JSON.stringify({ version: "1.0.0" }))).toThrow(/Malformed/);
    expect(() => parseFabricModJson(JSON.stringify({ id: "example" }))).toThrow(/Malformed/);
  });
});
