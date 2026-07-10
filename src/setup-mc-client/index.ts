import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import {
  downloadAssets,
  downloadLibraries,
} from "../lib/minecraft/clientDownload.js";
import { buildClientOptions } from "../lib/minecraft/clientOptions.js";
import { downloadToFile, verifySha1 } from "../lib/download.js";
import {
  fetchVersionManifest,
  getFullVersionData,
} from "../lib/mojang/mojang.js";
import { resolveUserAgent } from "../lib/userAgent.js";
import { setupFabric } from "./loaders/fabric.js";
import { setupNeoForge } from "./loaders/neoforge.js";
import {
  type ClientBuildState,
  type ClientLoaderContext,
  applyLoaderResult,
} from "./loaders/types.js";
import { setupVanillaClient } from "./loaders/vanilla.js";

async function run(): Promise<void> {
  const userAgent = resolveUserAgent("setup-mc-client");
  const inputMcVersion = core.getInput("minecraft-version");
  const clientDirectory = core.getInput("client-directory") || ".";
  const assetStrategy = core.getInput("asset-download-strategy") || "full";
  const concurrency = Number(core.getInput("download-concurrency") || "8");
  const clientOptions = core.getInput("client-options");
  const loader = core.getInput("loader") || "vanilla";

  if (assetStrategy !== "full" && assetStrategy !== "skip") {
    core.setFailed(
      `Unknown asset-download-strategy "${assetStrategy}", expected "full" or "skip"`,
    );
    return;
  }
  if (loader !== "vanilla" && loader !== "fabric" && loader !== "neoforge") {
    core.setFailed(
      `Unknown loader "${loader}", expected "vanilla", "fabric", or "neoforge"`,
    );
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

  const loaderContext: ClientLoaderContext = {
    mcVersion,
    userAgent,
    clientDirectory,
    versionData,
  };

  core.startGroup("Downloading client jar");
  let state: ClientBuildState = {
    jvmArgTemplate: [],
    gameArgTemplate: [],
    libraryDownloads: [],
    cacheKey: `mc-client-libraries-${mcVersion}`,
  };
  state = applyLoaderResult(state, await setupVanillaClient(loaderContext));
  core.endGroup();

  if (loader === "fabric") {
    core.startGroup("Fabric Loader");
    state = applyLoaderResult(state, await setupFabric(loaderContext));
    core.endGroup();
  } else if (loader === "neoforge") {
    core.startGroup("NeoForge installer");
    state = applyLoaderResult(state, await setupNeoForge(loaderContext));
    core.endGroup();
  }

  core.startGroup("Downloading libraries");
  const classpathEntries = await downloadLibraries(
    clientDirectory,
    userAgent,
    state.libraryDownloads,
    state.cacheKey,
    concurrency,
  );
  core.endGroup();

  let logConfigPath: string | undefined;
  let logConfigArgument: string | undefined;
  if (versionData.logging?.client) {
    core.startGroup("Downloading log4j configuration");
    const loggingFile = versionData.logging.client.file;
    logConfigPath = "log4j2.xml";
    const bytes = await downloadToFile(
      loggingFile.url,
      userAgent,
      join(clientDirectory, logConfigPath),
    );
    verifySha1(bytes, loggingFile.sha1, "Log4j config");
    logConfigArgument = versionData.logging.client.argument;
    core.endGroup();
  }

  core.startGroup("Downloading assets");
  await downloadAssets(
    clientDirectory,
    userAgent,
    versionData.assetIndex,
    assetStrategy,
    concurrency,
  );
  core.endGroup();

  const nativesDirectory = "natives";
  mkdirSync(join(clientDirectory, nativesDirectory), { recursive: true });

  // Defaults skip first-launch UI (multiplayer warning, accessibility onboarding, the
  // tutorial toast) that would otherwise sit in front of quickplay and block a headless
  // client from ever reaching a joinable state.
  writeFileSync(
    join(clientDirectory, "options.txt"),
    buildClientOptions(clientOptions),
  );

  writeFileSync(
    join(clientDirectory, "launch-config.json"),
    JSON.stringify(
      {
        mcVersion,
        mainClass: state.mainClass,
        assetsIndexId: versionData.assetIndex.id,
        nativesDirectory,
        classpathEntries,
        jvmArgTemplate: state.jvmArgTemplate,
        gameArgTemplate: state.gameArgTemplate,
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
