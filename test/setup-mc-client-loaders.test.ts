import { describe, expect, it } from "vitest";
import { applyLoaderResult, type ClientBuildState, type LoaderResult } from "../src/setup-mc-client/loaders/types.js";

function emptyState(cacheKey: string): ClientBuildState {
  return { jvmArgTemplate: [], gameArgTemplate: [], libraryDownloads: [], cacheKey };
}

describe("applyLoaderResult", () => {
  it("seeds mainClass/args/libraries/cacheKey from the first (vanilla baseline) result", () => {
    const vanilla: LoaderResult = {
      mainClass: "net.minecraft.client.main.Main",
      extraJvmArgs: ["-Djvm=1"],
      extraGameArgs: ["--game=1"],
      libraryDownloads: [{ url: "https://example/a.jar", relativePath: "libraries/a.jar", label: "a" }],
      cacheKeySuffix: "",
    };

    const state = applyLoaderResult(emptyState("mc-client-libraries-1.21.4"), vanilla);

    expect(state).toEqual({
      mainClass: "net.minecraft.client.main.Main",
      jvmArgTemplate: ["-Djvm=1"],
      gameArgTemplate: ["--game=1"],
      libraryDownloads: vanilla.libraryDownloads,
      cacheKey: "mc-client-libraries-1.21.4",
    });
  });

  it("appends a loader overlay's args/libraries onto the baseline and overrides mainClass", () => {
    const baseline = applyLoaderResult(emptyState("mc-client-libraries-1.21.4"), {
      mainClass: "net.minecraft.client.main.Main",
      extraJvmArgs: ["-Djvm=vanilla"],
      extraGameArgs: ["--game=vanilla"],
      libraryDownloads: [{ url: "https://example/vanilla.jar", relativePath: "libraries/vanilla.jar", label: "vanilla" }],
      cacheKeySuffix: "",
    });

    const fabric: LoaderResult = {
      mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient",
      extraJvmArgs: ["-DFabricMcEmu= net.minecraft.client.main.Main "],
      extraGameArgs: [],
      libraryDownloads: [{ url: "https://example/fabric.jar", relativePath: "libraries/fabric.jar", label: "fabric" }],
      cacheKeySuffix: "-fabric-0.16.9",
    };

    const state = applyLoaderResult(baseline, fabric);

    expect(state.mainClass).toBe("net.fabricmc.loader.impl.launch.knot.KnotClient");
    expect(state.jvmArgTemplate).toEqual(["-Djvm=vanilla", "-DFabricMcEmu= net.minecraft.client.main.Main "]);
    expect(state.gameArgTemplate).toEqual(["--game=vanilla"]);
    expect(state.libraryDownloads).toEqual([
      { url: "https://example/vanilla.jar", relativePath: "libraries/vanilla.jar", label: "vanilla" },
      { url: "https://example/fabric.jar", relativePath: "libraries/fabric.jar", label: "fabric" },
    ]);
    expect(state.cacheKey).toBe("mc-client-libraries-1.21.4-fabric-0.16.9");
  });

  it("keeps the baseline mainClass when the overlay result has none", () => {
    const baseline = applyLoaderResult(emptyState("mc-client-libraries-1.21.4"), {
      mainClass: "net.minecraft.client.main.Main",
      extraJvmArgs: [],
      extraGameArgs: [],
      libraryDownloads: [],
      cacheKeySuffix: "",
    });

    const state = applyLoaderResult(baseline, {
      extraJvmArgs: [],
      extraGameArgs: [],
      libraryDownloads: [],
      cacheKeySuffix: "-something",
    });

    expect(state.mainClass).toBe("net.minecraft.client.main.Main");
  });
});
