import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import { fetchVersionManifest, getServerDownloadForMcVersion } from "../lib/mojang.js";
import { buildServerProperties } from "../lib/serverProperties.js";

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });
  const inputMcVersion = core.getInput("minecraft-version");
  const serverDirectory = core.getInput("server-directory") || ".";
  const acceptEula = core.getInput("accept-eula", { required: true });
  const serverProperties = core.getInput("server-properties");

  if (acceptEula !== "true") {
    core.setFailed(
      'accept-eula must be set to "true" to acknowledge the Minecraft EULA (https://aka.ms/MinecraftEULA)',
    );
    return;
  }

  core.startGroup("Minecraft version");
  const manifest = await fetchVersionManifest(userAgent);
  const mcVersion = inputMcVersion || manifest.latest.release;
  if (!inputMcVersion) {
    core.info(`No version specified, using latest release: ${mcVersion}`);
  }
  const download = await getServerDownloadForMcVersion(manifest, mcVersion, userAgent);
  core.info(`Minecraft version: ${mcVersion}`);
  core.endGroup();

  mkdirSync(serverDirectory, { recursive: true });

  core.startGroup("Downloading server jar");
  const response = await fetch(download.url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    core.setFailed(`Failed to download server jar: HTTP ${response.status}`);
    return;
  }
  const jarBytes = Buffer.from(await response.arrayBuffer());
  const actualSha1 = createHash("sha1").update(jarBytes).digest("hex");
  if (actualSha1 !== download.sha1) {
    core.setFailed(`Server jar SHA-1 mismatch: expected ${download.sha1}, got ${actualSha1}`);
    return;
  }
  const jarPath = join(serverDirectory, "server.jar");
  writeFileSync(jarPath, jarBytes);
  core.info(`Wrote ${jarPath} (${jarBytes.length} bytes)`);
  core.endGroup();

  writeFileSync(join(serverDirectory, "eula.txt"), "eula=true\n");

  const rconPassword = randomBytes(18).toString("base64url");
  writeFileSync(join(serverDirectory, "server.properties"), buildServerProperties(serverProperties, rconPassword));

  core.setOutput("server-directory", serverDirectory);
  core.setOutput("minecraft-version", mcVersion);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
