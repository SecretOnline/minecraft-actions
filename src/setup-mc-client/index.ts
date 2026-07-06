import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import PQueue from "p-queue";
import { type AssetIndex, assetObjectPath, buildAssetObjectUrl } from "../lib/assets.js";
import { buildClientOptions } from "../lib/clientOptions.js";
import { downloadToFile, verifySha1 } from "../lib/download.js";
import {
  buildFabricLibraryUrl,
  fetchFabricLoaderVersions,
  fetchFabricProfile,
  findLatestStableFabricVersion,
  mavenCoordinateToPath,
} from "../lib/fabric.js";
import { filterLibrariesForLinux } from "../lib/launcherRules.js";
import { fetchVersionManifest, getFullVersionData, type MojangArgumentEntry, type MojangLibrary } from "../lib/mojang.js";
import { buildNeoForgeInstallerUrl, fetchNeoForgeVersions, findLatestNeoForgeVersion } from "../lib/neoforge.js";

interface LibraryDownload {
  url: string;
  relativePath: string;
  sha1?: string;
  size?: number;
  label: string;
}

interface LoaderResult {
  mainClass?: string;
  extraJvmArgs: MojangArgumentEntry[];
  extraGameArgs: MojangArgumentEntry[];
  libraryDownloads: LibraryDownload[];
  cacheKeySuffix: string;
}

function libraryToDownload(library: MojangLibrary): LibraryDownload {
  const artifact = library.downloads.artifact;
  if (!artifact) {
    throw new Error(`Library ${library.name} has no artifact after filtering`);
  }
  return {
    url: artifact.url,
    relativePath: join("libraries", artifact.path),
    sha1: artifact.sha1,
    size: artifact.size,
    label: library.name,
  };
}

async function tryRestoreCache(paths: string[], key: string): Promise<boolean> {
  try {
    const restored = await cache.restoreCache(paths, key);
    core.info(restored ? `Cache hit for key "${key}"` : `Cache miss for key "${key}"`);
    return restored !== undefined;
  } catch (error) {
    core.warning(`Cache restore failed, continuing without it: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function trySaveCache(paths: string[], key: string): Promise<void> {
  try {
    await cache.saveCache(paths, key);
  } catch (error) {
    core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function downloadAssets(
  clientDirectory: string,
  userAgent: string,
  assetIndex: { id: string; url: string; sha1: string },
  strategy: string,
  concurrency: number,
): Promise<void> {
  const indexesDir = join(clientDirectory, "assets", "indexes");
  mkdirSync(indexesDir, { recursive: true });
  const indexPath = join(indexesDir, `${assetIndex.id}.json`);
  const indexBytes = await downloadToFile(assetIndex.url, userAgent, indexPath);
  verifySha1(indexBytes, assetIndex.sha1, "Asset index");

  if (strategy === "skip") {
    core.info('asset-download-strategy is "skip": asset index downloaded, objects skipped');
    return;
  }

  const assetsDir = join(clientDirectory, "assets");
  const objectsDir = join(assetsDir, "objects");
  const cacheKey = `mc-client-assets-${assetIndex.id}`;
  const cacheHit = await tryRestoreCache([objectsDir], cacheKey);

  const index = JSON.parse(indexBytes.toString("utf8")) as AssetIndex;
  const objects = Object.entries(index.objects);
  const queue = new PQueue({ concurrency });
  let downloaded = 0;
  let completed = 0;

  const tasks = objects.map(([, { hash, size }]) =>
    queue.add(async () => {
      const destination = assetObjectPath(assetsDir, hash);
      if (!(existsSync(destination) && statSync(destination).size === size)) {
        mkdirSync(dirname(destination), { recursive: true });
        const bytes = await downloadToFile(buildAssetObjectUrl(hash), userAgent, destination);
        verifySha1(bytes, hash, "Asset object");
        downloaded += 1;
      }
      completed += 1;
      if (completed % 200 === 0) {
        core.info(`Processed ${completed}/${objects.length} asset objects...`);
      }
    }),
  );
  await Promise.all(tasks);
  core.info(`Downloaded ${downloaded}/${objects.length} asset objects (rest already present/cached)`);

  if (!cacheHit) {
    await trySaveCache([objectsDir], cacheKey);
  }
}

async function downloadLibraries(
  clientDirectory: string,
  userAgent: string,
  libraryDownloads: LibraryDownload[],
  cacheKey: string,
  concurrency: number,
): Promise<string[]> {
  const librariesDir = join(clientDirectory, "libraries");
  const cacheHit = await tryRestoreCache([librariesDir], cacheKey);

  const queue = new PQueue({ concurrency });
  const classpathEntries: string[] = ["client.jar", ...libraryDownloads.map((lib) => lib.relativePath)];
  const tasks = libraryDownloads.map((lib) =>
    queue.add(async () => {
      const destination = join(clientDirectory, lib.relativePath);
      if (existsSync(destination) && (lib.size === undefined || statSync(destination).size === lib.size)) {
        return;
      }
      mkdirSync(dirname(destination), { recursive: true });
      const bytes = await downloadToFile(lib.url, userAgent, destination);
      if (lib.sha1) {
        verifySha1(bytes, lib.sha1, lib.label);
      }
    }),
  );
  await Promise.all(tasks);
  core.info(`Downloaded ${libraryDownloads.length} libraries`);

  if (!cacheHit) {
    await trySaveCache([librariesDir], cacheKey);
  }
  return classpathEntries;
}

async function setupFabric(mcVersion: string, userAgent: string): Promise<LoaderResult> {
  const inputLoaderVersion = core.getInput("fabric-loader-version");
  const loaderVersion = inputLoaderVersion || findLatestStableFabricVersion(await fetchFabricLoaderVersions(userAgent));
  if (!loaderVersion) {
    throw new Error("Could not find a stable Fabric Loader version");
  }
  core.info(`Fabric Loader: ${loaderVersion}`);
  core.setOutput("fabric-loader-version", loaderVersion);

  // Fabric's "profile" is a standard Mojang launcher version JSON with
  // inheritsFrom: <mcVersion> - it only overrides mainClass, adds a few extra
  // jvm/game args, and lists its own (pure-Java, no OS rules) libraries.
  const profile = await fetchFabricProfile(mcVersion, loaderVersion, userAgent);
  return {
    mainClass: profile.mainClass,
    extraJvmArgs: profile.arguments.jvm,
    extraGameArgs: profile.arguments.game,
    libraryDownloads: profile.libraries.map((library) => ({
      url: buildFabricLibraryUrl(library),
      relativePath: join("libraries", mavenCoordinateToPath(library.name)),
      sha1: library.sha1,
      size: library.size,
      label: library.name,
    })),
    cacheKeySuffix: `-fabric-${loaderVersion}`,
  };
}

async function setupNeoForge(mcVersion: string, userAgent: string, clientDirectory: string): Promise<LoaderResult> {
  const inputNeoForgeVersion = core.getInput("neoforge-version");
  const numericVersion = mcVersion.replace(/-(snapshot|pre|rc).*$/, "");
  const neoforgeVersion =
    inputNeoForgeVersion || findLatestNeoForgeVersion(await fetchNeoForgeVersions(userAgent), numericVersion);
  if (!neoforgeVersion) {
    throw new Error(`Could not find a NeoForge version for Minecraft ${mcVersion}`);
  }
  core.info(`NeoForge: ${neoforgeVersion}`);
  core.setOutput("neoforge-version", neoforgeVersion);

  // Unlike Fabric, NeoForge has no client-loader metadata API - the installer must
  // actually run. It also refuses to run at all against a directory with no launcher
  // profile record, so a minimal stub is required first.
  writeFileSync(join(clientDirectory, "launcher_profiles.json"), JSON.stringify({ profiles: {}, settings: {}, version: 3 }));

  const installerPath = join(clientDirectory, "installer.jar");
  await downloadToFile(buildNeoForgeInstallerUrl(neoforgeVersion), userAgent, installerPath);

  const result = spawnSync("java", ["-jar", "installer.jar", "--install-client", "."], {
    cwd: clientDirectory,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`NeoForge installer exited with code ${result.status}`);
  }
  unlinkSync(installerPath);

  const profileId = `neoforge-${neoforgeVersion}`;
  const profile = JSON.parse(readFileSync(join(clientDirectory, "versions", profileId, `${profileId}.json`), "utf8")) as {
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
    join("libraries", "net", "neoforged", "minecraft-client-patched", neoforgeVersion, `minecraft-client-patched-${neoforgeVersion}.jar`),
  ];
  const patchedJarRelativePath = patchedJarCandidates.find((candidate) => existsSync(join(clientDirectory, candidate)));
  if (!existsSync(join(clientDirectory, universalJarRelativePath)) || !patchedJarRelativePath) {
    const dirsChecked = [
      neoforgeLibDir,
      join("libraries", "net", "neoforged", "minecraft-client-patched", neoforgeVersion),
    ];
    const found = dirsChecked
      .map((dir) => {
        const dirAbs = join(clientDirectory, dir);
        return `${dir}: ${existsSync(dirAbs) ? readdirSync(dirAbs).join(", ") : "(doesn't exist)"}`;
      })
      .join("; ");
    throw new Error(`Expected a NeoForge universal jar and a patched Minecraft jar, found: ${found}`);
  }

  // Installer scaffolding not needed at launch time.
  rmSync(join(clientDirectory, "versions"), { recursive: true, force: true });
  rmSync(join(clientDirectory, "launcher_profiles.json"), { force: true });

  return {
    mainClass: profile.mainClass,
    extraJvmArgs: profile.arguments.jvm,
    extraGameArgs: profile.arguments.game,
    libraryDownloads: filterLibrariesForLinux(profile.libraries).map(libraryToDownload),
    cacheKeySuffix: `-neoforge-${neoforgeVersion}`,
  };
}

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });
  const inputMcVersion = core.getInput("minecraft-version");
  const clientDirectory = core.getInput("client-directory") || ".";
  const assetStrategy = core.getInput("asset-download-strategy") || "full";
  const concurrency = Number(core.getInput("download-concurrency") || "8");
  const clientOptions = core.getInput("client-options");
  const loader = core.getInput("loader") || "vanilla";

  if (assetStrategy !== "full" && assetStrategy !== "skip") {
    core.setFailed(`Unknown asset-download-strategy "${assetStrategy}", expected "full" or "skip"`);
    return;
  }
  if (loader !== "vanilla" && loader !== "fabric" && loader !== "neoforge") {
    core.setFailed(`Unknown loader "${loader}", expected "vanilla", "fabric", or "neoforge"`);
    return;
  }

  core.startGroup("Minecraft version");
  const manifest = await fetchVersionManifest(userAgent);
  const mcVersion = inputMcVersion || manifest.latest.release;
  if (!inputMcVersion) {
    core.info(`No version specified, using latest release: ${mcVersion}`);
  }
  const versionData = await getFullVersionData(manifest, mcVersion, userAgent);
  if (!versionData.downloads.client) {
    core.setFailed(`Minecraft version ${mcVersion} has no client download`);
    return;
  }
  core.info(`Minecraft version: ${mcVersion}`);
  core.endGroup();

  mkdirSync(clientDirectory, { recursive: true });

  core.startGroup("Downloading client jar");
  const clientJarBytes = await downloadToFile(versionData.downloads.client.url, userAgent, join(clientDirectory, "client.jar"));
  verifySha1(clientJarBytes, versionData.downloads.client.sha1, "Client jar");
  core.info(`Wrote client.jar (${clientJarBytes.length} bytes)`);
  core.endGroup();

  const vanillaLibraryDownloads = filterLibrariesForLinux(versionData.libraries).map(libraryToDownload);

  let mainClass = versionData.mainClass;
  let jvmArgTemplate: MojangArgumentEntry[] = versionData.arguments.jvm;
  let gameArgTemplate: MojangArgumentEntry[] = versionData.arguments.game;
  let loaderLibraryDownloads: LibraryDownload[] = [];
  let libraryCacheKey = `mc-client-libraries-${mcVersion}`;

  if (loader === "fabric") {
    core.startGroup("Fabric Loader");
    const fabric = await setupFabric(mcVersion, userAgent);
    mainClass = fabric.mainClass ?? mainClass;
    jvmArgTemplate = [...jvmArgTemplate, ...fabric.extraJvmArgs];
    gameArgTemplate = [...gameArgTemplate, ...fabric.extraGameArgs];
    loaderLibraryDownloads = fabric.libraryDownloads;
    libraryCacheKey += fabric.cacheKeySuffix;
    core.endGroup();
  } else if (loader === "neoforge") {
    core.startGroup("NeoForge installer");
    const neoforge = await setupNeoForge(mcVersion, userAgent, clientDirectory);
    mainClass = neoforge.mainClass ?? mainClass;
    jvmArgTemplate = [...jvmArgTemplate, ...neoforge.extraJvmArgs];
    gameArgTemplate = [...gameArgTemplate, ...neoforge.extraGameArgs];
    loaderLibraryDownloads = neoforge.libraryDownloads;
    libraryCacheKey += neoforge.cacheKeySuffix;
    core.endGroup();
  }

  core.startGroup("Downloading libraries");
  const classpathEntries = await downloadLibraries(
    clientDirectory,
    userAgent,
    [...vanillaLibraryDownloads, ...loaderLibraryDownloads],
    libraryCacheKey,
    concurrency,
  );
  core.endGroup();

  let logConfigPath: string | undefined;
  let logConfigArgument: string | undefined;
  if (versionData.logging?.client) {
    core.startGroup("Downloading log4j configuration");
    const loggingFile = versionData.logging.client.file;
    logConfigPath = "log4j2.xml";
    const bytes = await downloadToFile(loggingFile.url, userAgent, join(clientDirectory, logConfigPath));
    verifySha1(bytes, loggingFile.sha1, "Log4j config");
    logConfigArgument = versionData.logging.client.argument;
    core.endGroup();
  }

  core.startGroup("Downloading assets");
  await downloadAssets(clientDirectory, userAgent, versionData.assetIndex, assetStrategy, concurrency);
  core.endGroup();

  const nativesDirectory = "natives";
  mkdirSync(join(clientDirectory, nativesDirectory), { recursive: true });

  // Defaults skip first-launch UI (multiplayer warning, accessibility onboarding, the
  // tutorial toast) that would otherwise sit in front of quickplay and block a headless
  // client from ever reaching a joinable state.
  writeFileSync(join(clientDirectory, "options.txt"), buildClientOptions(clientOptions));

  writeFileSync(
    join(clientDirectory, "launch-config.json"),
    JSON.stringify(
      {
        mcVersion,
        mainClass,
        assetsIndexId: versionData.assetIndex.id,
        nativesDirectory,
        classpathEntries,
        jvmArgTemplate,
        gameArgTemplate,
        logConfigArgument,
        logConfigPath,
      },
      null,
      2,
    ),
  );

  core.setOutput("client-directory", clientDirectory);
  core.setOutput("minecraft-version", mcVersion);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
