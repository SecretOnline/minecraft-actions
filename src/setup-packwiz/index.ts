import { chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { tryRestoreCache, trySaveCache } from "../lib/cache.js";
import {
  installPackwizFromSource,
  PACKWIZ_CACHE_KEY_PREFIX,
  PACKWIZ_SOURCE_BUILD_VERSION,
  PACKWIZ_TOOL_NAME,
  resolveGobinDir,
  resolvePackwizCacheDir,
  tryDownloadNightlyLink,
} from "../lib/packwiz.js";
import { resolveUserAgent } from "../lib/userAgent.js";

/**
 * The cache is saved in a post step rather than here, since packwiz's cache directory
 * only fills up once the user's own later steps actually run packwiz commands (this
 * action only installs the binary).
 */
async function restorePackwizCache(): Promise<void> {
  const cacheDir = resolvePackwizCacheDir();
  mkdirSync(cacheDir, { recursive: true });
  core.startGroup("Restoring packwiz download cache");
  await tryRestoreCache([cacheDir], `${PACKWIZ_CACHE_KEY_PREFIX}${process.env.GITHUB_RUN_ID}`, [PACKWIZ_CACHE_KEY_PREFIX]);
  core.endGroup();
}

async function savePackwizCache(): Promise<void> {
  core.startGroup("Saving packwiz download cache");
  await trySaveCache([resolvePackwizCacheDir()], `${PACKWIZ_CACHE_KEY_PREFIX}${process.env.GITHUB_RUN_ID}`);
  core.endGroup();
}

async function install(): Promise<void> {
  const userAgent = resolveUserAgent("setup-packwiz");

  const scratchDir = join(process.env.RUNNER_TEMP || tmpdir(), "setup-packwiz");
  mkdirSync(scratchDir, { recursive: true });

  let binDir: string | undefined;

  core.startGroup("Downloading packwiz from nightly.link");
  const zipPath = join(scratchDir, "packwiz.zip");
  const nightlyResult = await tryDownloadNightlyLink(userAgent, zipPath);
  if (nightlyResult === "downloaded") {
    const extractedDir = await tc.extractZip(zipPath, join(scratchDir, "nightly-link"));
    chmodSync(join(extractedDir, "packwiz"), 0o755);
    binDir = extractedDir;
    core.info("Installed packwiz from nightly.link");
  } else if (nightlyResult === "not-found") {
    core.info("nightly.link returned 404 (packwiz CI artifact likely expired) - falling back");
  } else {
    core.warning("Could not reach nightly.link due to a network error - falling back");
  }
  core.endGroup();

  if (!binDir) {
    core.startGroup("Checking tool-cache for a previously-built packwiz");
    const cachedDir = tc.find(PACKWIZ_TOOL_NAME, PACKWIZ_SOURCE_BUILD_VERSION);
    if (cachedDir) {
      binDir = cachedDir;
      core.info(`Found cached packwiz build at ${cachedDir}`);
    } else {
      core.info("No cached packwiz build found - falling back to building from source");
    }
    core.endGroup();
  }

  if (!binDir) {
    core.startGroup("Building packwiz from source (go install)");
    const gobinDir = resolveGobinDir();
    mkdirSync(gobinDir, { recursive: true });
    installPackwizFromSource(gobinDir);
    binDir = await tc.cacheDir(gobinDir, PACKWIZ_TOOL_NAME, PACKWIZ_SOURCE_BUILD_VERSION);
    core.info(`Built and cached packwiz at ${binDir}`);
    core.endGroup();
  }

  core.addPath(binDir);
  core.setOutput("packwiz-path", join(binDir, "packwiz"));
}

async function run(): Promise<void> {
  if (core.getState("isPost")) {
    await savePackwizCache();
    return;
  }
  core.saveState("isPost", "true");
  await restorePackwizCache();
  await install();
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
