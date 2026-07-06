import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as cache from "@actions/cache";
import * as core from "@actions/core";
import PQueue from "p-queue";
import { type AssetIndex, assetObjectPath, buildAssetObjectUrl } from "../lib/assets.js";
import { buildClientOptions } from "../lib/clientOptions.js";
import { downloadToFile, verifySha1 } from "../lib/download.js";
import { filterLibrariesForLinux } from "../lib/launcherRules.js";
import { fetchVersionManifest, getFullVersionData } from "../lib/mojang.js";

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
  libraries: ReturnType<typeof filterLibrariesForLinux>,
  mcVersion: string,
  concurrency: number,
): Promise<string[]> {
  const librariesDir = join(clientDirectory, "libraries");
  const cacheKey = `mc-client-libraries-${mcVersion}`;
  const cacheHit = await tryRestoreCache([librariesDir], cacheKey);

  const queue = new PQueue({ concurrency });
  const classpathEntries: string[] = ["client.jar"];
  const tasks = libraries.map((library) => {
    const artifact = library.downloads.artifact;
    if (!artifact) {
      return undefined;
    }
    const relativePath = join("libraries", artifact.path);
    classpathEntries.push(relativePath);
    return queue.add(async () => {
      const destination = join(clientDirectory, relativePath);
      if (existsSync(destination) && statSync(destination).size === artifact.size) {
        return;
      }
      mkdirSync(dirname(destination), { recursive: true });
      const bytes = await downloadToFile(artifact.url, userAgent, destination);
      verifySha1(bytes, artifact.sha1, library.name);
    });
  });
  await Promise.all(tasks);
  core.info(`Downloaded ${libraries.length} libraries`);

  if (!cacheHit) {
    await trySaveCache([librariesDir], cacheKey);
  }
  return classpathEntries;
}

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });
  const inputMcVersion = core.getInput("minecraft-version");
  const clientDirectory = core.getInput("client-directory") || ".";
  const assetStrategy = core.getInput("asset-download-strategy") || "full";
  const concurrency = Number(core.getInput("download-concurrency") || "8");
  const clientOptions = core.getInput("client-options");

  if (assetStrategy !== "full" && assetStrategy !== "skip") {
    core.setFailed(`Unknown asset-download-strategy "${assetStrategy}", expected "full" or "skip"`);
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

  core.startGroup("Downloading libraries");
  const libraries = filterLibrariesForLinux(versionData.libraries);
  const classpathEntries = await downloadLibraries(clientDirectory, userAgent, libraries, mcVersion, concurrency);
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
        mainClass: versionData.mainClass,
        assetsIndexId: versionData.assetIndex.id,
        nativesDirectory,
        classpathEntries,
        jvmArgTemplate: versionData.arguments.jvm,
        gameArgTemplate: versionData.arguments.game,
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
