import * as core from "@actions/core";
import { listProjectVersions } from "../lib/modrinth/modrinthVersions.js";
import { resolveUserAgent } from "../lib/userAgent.js";

async function run(): Promise<void> {
  const userAgent = resolveUserAgent("get-latest-mod-version");
  const minecraftVersion = core.getInput("minecraft-version", { required: true });
  const modId = core.getInput("mod-id", { required: true });
  const allowPreRelease = core.getBooleanInput("allow-pre-release");

  const versions = await listProjectVersions(modId, { gameVersions: [minecraftVersion] }, userAgent);
  const matching = allowPreRelease ? versions : versions.filter((version) => version.versionType === "release");

  const latest = matching[0];
  if (!latest) {
    core.setFailed(`Could not find a version of mod ${modId} for Minecraft ${minecraftVersion}`);
    return;
  }

  core.info(`Latest version: ${latest.versionNumber} (${latest.versionType})`);
  core.setOutput("mod-version", latest.versionNumber);
  core.setOutput("release-type", latest.versionType);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
