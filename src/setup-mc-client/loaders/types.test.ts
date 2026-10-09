import { describe, expect, it } from "vitest";
import { applyLoaderResult, type ClientBuildState, type LoaderResult } from "./types.js";

function emptyState(cacheKey: string): ClientBuildState {
  return { jvmArgTemplate: [], gameArgTemplate: [], libraryDownloads: [], classpathExcludePaths: [], cacheKey };
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
      classpathExcludePaths: [],
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
      classpathExcludePaths: ["libraries/fabric.jar"],
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
    expect(state.classpathExcludePaths).toEqual(["libraries/fabric.jar"]);
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

  it("dedupes libraries by relativePath, keeping the overlay's entry", () => {
    const baseline = applyLoaderResult(emptyState("mc-client-libraries-1.21.1"), {
      mainClass: "net.minecraft.client.main.Main",
      extraJvmArgs: [],
      extraGameArgs: [],
      libraryDownloads: [
        {
          url: "https://vanilla.example/gson.jar",
          relativePath: "libraries/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",
          label: "com.google.code.gson:gson:2.10.1",
        },
        { url: "https://example/guava.jar", relativePath: "libraries/com/google/guava/guava/32.1.2-jre/guava-32.1.2-jre.jar", label: "com.google.guava:guava:32.1.2-jre" },
      ],
      cacheKeySuffix: "",
    });

    // Mirrors a legacy NeoForge profile that re-lists the full parent (vanilla) library
    // set instead of only its own delta - gson overlaps the baseline at the exact same
    // relativePath, bootstraplauncher doesn't.
    const neoforge: LoaderResult = {
      mainClass: "cpw.mods.bootstraplauncher.BootstrapLauncher",
      extraJvmArgs: [],
      extraGameArgs: [],
      libraryDownloads: [
        {
          url: "https://neoforge.example/gson.jar",
          relativePath: "libraries/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",
          label: "com.google.code.gson:gson:2.10.1",
        },
        { url: "https://example/bootstraplauncher.jar", relativePath: "libraries/cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar", label: "cpw.mods:bootstraplauncher:2.0.2" },
      ],
      cacheKeySuffix: "-neoforge-21.1.256",
    };

    const state = applyLoaderResult(baseline, neoforge);

    expect(state.libraryDownloads).toEqual([
      { url: "https://example/guava.jar", relativePath: "libraries/com/google/guava/guava/32.1.2-jre/guava-32.1.2-jre.jar", label: "com.google.guava:guava:32.1.2-jre" },
      {
        url: "https://neoforge.example/gson.jar",
        relativePath: "libraries/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",
        label: "com.google.code.gson:gson:2.10.1",
      },
      { url: "https://example/bootstraplauncher.jar", relativePath: "libraries/cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar", label: "cpw.mods:bootstraplauncher:2.0.2" },
    ]);
  });

  it("does not dedupe same groupId:artifactId libraries with different classifiers (e.g. natives)", () => {
    const baseline = applyLoaderResult(emptyState("mc-client-libraries-1.21.1"), {
      mainClass: "net.minecraft.client.main.Main",
      extraJvmArgs: [],
      extraGameArgs: [],
      libraryDownloads: [
        {
          url: "https://example/lwjgl.jar",
          relativePath: "libraries/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3.jar",
          label: "org.lwjgl:lwjgl:3.3.3",
        },
        {
          url: "https://example/lwjgl-natives-linux.jar",
          relativePath: "libraries/org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux.jar",
          label: "org.lwjgl:lwjgl:3.3.3:natives-linux",
        },
      ],
      cacheKeySuffix: "",
    });

    const state = applyLoaderResult(baseline, {
      extraJvmArgs: [],
      extraGameArgs: [],
      libraryDownloads: [],
      cacheKeySuffix: "-fabric-0.16.9",
    });

    expect(state.libraryDownloads).toHaveLength(2);
  });
});
