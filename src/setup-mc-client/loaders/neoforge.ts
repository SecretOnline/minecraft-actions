import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import { filterLibrariesForLinux } from "../../lib/mojang/launcherRules.js";
import type { MojangArgumentEntry, MojangLibrary } from "../../lib/mojang/mojang.js";
import { fetchNeoForgeVersions, findLatestNeoForgeVersion, runNeoForgeInstaller } from "../../lib/loaders/neoforge.js";
import { type ClientLoaderContext, type LoaderResult, libraryToDownload } from "./types.js";

// NeoForge's profile puts its bootstrap libraries (bootstraplauncher, securejarhandler,
// the ASM jars, JarJarFileSystems) on the JVM module path via a "-p"/"--module-path"
// argument, in addition to listing them in the ordinary `libraries` array.
function modulePathLibraryPaths(jvmArgs: MojangArgumentEntry[]): Set<string> {
  const flagIndex = jvmArgs.findIndex((arg) => arg === "-p" || arg === "--module-path");
  const value = flagIndex === -1 ? undefined : jvmArgs[flagIndex + 1];
  if (typeof value !== "string") {
    return new Set();
  }
  return new Set(
    value.split("${classpath_separator}").map((entry) => entry.replace("${library_directory}/", "")),
  );
}

export async function setupNeoForge(ctx: ClientLoaderContext): Promise<LoaderResult> {
  const inputNeoForgeVersion = core.getInput("neoforge-version");
  const numericVersion = ctx.mcVersion.replace(/-(snapshot|pre|rc).*$/, "");
  const neoforgeVersion =
    inputNeoForgeVersion || findLatestNeoForgeVersion(await fetchNeoForgeVersions(ctx.userAgent), numericVersion);
  if (!neoforgeVersion) {
    throw new Error(`Could not find a NeoForge version for Minecraft ${ctx.mcVersion}`);
  }
  core.info(`NeoForge: ${neoforgeVersion}`);
  core.setOutput("neoforge-version", neoforgeVersion);

  // Unlike Fabric, NeoForge has no client-loader metadata API - the installer must
  // actually run. It also refuses to run at all against a directory with no launcher
  // profile record, so a minimal stub is required first.
  writeFileSync(
    join(ctx.clientDirectory, "launcher_profiles.json"),
    JSON.stringify({ profiles: {}, settings: {}, version: 3 }),
  );

  await runNeoForgeInstaller(neoforgeVersion, ctx.userAgent, ctx.clientDirectory, ["--install-client", "."]);

  const profileId = `neoforge-${neoforgeVersion}`;
  const profile = JSON.parse(
    readFileSync(join(ctx.clientDirectory, "versions", profileId, `${profileId}.json`), "utf8"),
  ) as {
    mainClass: string;
    arguments: { game: MojangArgumentEntry[]; jvm: MojangArgumentEntry[] };
    libraries: MojangLibrary[];
  };

  // The installer's own patched/universal client jar isn't listed in the profile's
  // libraries at all - it's an implicit output at a version-derived path, and it must
  // NOT be added to the classpath: FML's GameLocator treats any classpath that already
  // contains both a resolvable NeoForge jar and a resolvable patched-Minecraft jar as a
  // NeoGradle dev workspace, which then requires a "Minecraft-Dists" manifest attribute
  // our installer output doesn't have. Leaving these two jars off the classpath entirely
  // instead makes GameLocator take its production-locate path (using the profile's own
  // --fml.mcVersion/--fml.neoForgeVersion/--fml.neoFormVersion game args, already passed
  // through via extraGameArgs below), which finds them itself under libraryDirectory.
  // They're still verified present here as a sanity check that the installer actually
  // produced usable output - just never referenced on -cp.
  //
  // Filename depends on the Minecraft versioning scheme: the old 1.x scheme goes through
  // a binary-patcher producing "-client.jar", while the newer year-based scheme (e.g.
  // 26.x) ships a "-universal.jar" instead (confirmed live for both) - so check both
  // rather than assuming one.
  const neoforgeLibDir = join("libraries", "net", "neoforged", "neoforge", neoforgeVersion);
  const universalJarRelativePath = join(neoforgeLibDir, `neoforge-${neoforgeVersion}-universal.jar`);
  const patchedJarCandidates = [
    join(neoforgeLibDir, `neoforge-${neoforgeVersion}-client.jar`),
    join(
      "libraries",
      "net",
      "neoforged",
      "minecraft-client-patched",
      neoforgeVersion,
      `minecraft-client-patched-${neoforgeVersion}.jar`,
    ),
  ];
  const patchedJarRelativePath = patchedJarCandidates.find((candidate) =>
    existsSync(join(ctx.clientDirectory, candidate)),
  );
  if (!existsSync(join(ctx.clientDirectory, universalJarRelativePath)) || !patchedJarRelativePath) {
    const dirsChecked = [
      neoforgeLibDir,
      join("libraries", "net", "neoforged", "minecraft-client-patched", neoforgeVersion),
    ];
    const found = dirsChecked
      .map((dir) => {
        const dirAbs = join(ctx.clientDirectory, dir);
        return `${dir}: ${existsSync(dirAbs) ? readdirSync(dirAbs).join(", ") : "(doesn't exist)"}`;
      })
      .join("; ");
    throw new Error(`Expected a NeoForge universal jar and a patched Minecraft jar, found: ${found}`);
  }

  // Installer scaffolding not needed at launch time.
  rmSync(join(ctx.clientDirectory, "versions"), { recursive: true, force: true });
  rmSync(join(ctx.clientDirectory, "launcher_profiles.json"), { force: true });

  const libraryDownloads = filterLibrariesForLinux(profile.libraries).map(libraryToDownload);
  const modulePathPaths = modulePathLibraryPaths(profile.arguments.jvm);

  return {
    mainClass: profile.mainClass,
    extraJvmArgs: profile.arguments.jvm,
    extraGameArgs: profile.arguments.game,
    // These still need to be downloaded onto disk, just left out of classpathEntries below.
    libraryDownloads,
    classpathExcludePaths: [
      // Same reasoning as the universal/patched jars above: GameLocator resolves the
      // actual game classes itself from libraryDirectory, it never reads them from this
      // raw client.jar. Leaving it on the classpath anyway is at best redundant - on
      // legacy (1.x) Minecraft versions it's actively harmful, since the jar has no
      // module-info and so becomes an automatic module named "client", which ends up
      // exporting the same packages (e.g. net.minecraft.obfuscate) as FML's own merged
      // "minecraft" module, causing a module resolution conflict at launch.
      "client.jar",
      ...libraryDownloads
        .map((library) => library.relativePath)
        .filter((relativePath) => modulePathPaths.has(relativePath.slice("libraries/".length))),
    ],
    cacheKeySuffix: `-neoforge-${neoforgeVersion}`,
  };
}
