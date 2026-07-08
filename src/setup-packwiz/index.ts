import { chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import {
  installPackwizFromSource,
  PACKWIZ_SOURCE_BUILD_VERSION,
  PACKWIZ_TOOL_NAME,
  resolveGobinDir,
  tryDownloadNightlyLink,
} from "../lib/packwiz.js";

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });

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

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
