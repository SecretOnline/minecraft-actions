import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import { fetchVersionManifest } from "../lib/mojang.js";
import { buildServerProperties } from "../lib/serverProperties.js";
import { setupFabricServer } from "./loaders/fabric.js";
import { setupNeoForgeServer } from "./loaders/neoforge.js";
import type { ServerLoaderContext } from "./loaders/types.js";
import { setupVanillaServer } from "./loaders/vanilla.js";

const loaders = {
  vanilla: setupVanillaServer,
  fabric: setupFabricServer,
  neoforge: setupNeoForgeServer,
} as const satisfies Record<string, (ctx: ServerLoaderContext) => Promise<void>>;

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });
  const inputMcVersion = core.getInput("minecraft-version");
  const serverDirectory = core.getInput("server-directory") || ".";
  const acceptEula = core.getInput("accept-eula", { required: true });
  const serverProperties = core.getInput("server-properties");
  const loader = core.getInput("loader") || "vanilla";

  if (acceptEula !== "true") {
    core.setFailed(
      'accept-eula must be set to "true" to acknowledge the Minecraft EULA (https://aka.ms/MinecraftEULA)',
    );
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
  core.info(`Minecraft version: ${mcVersion}`);
  core.endGroup();

  mkdirSync(serverDirectory, { recursive: true });
  const jarPath = join(serverDirectory, "server.jar");

  core.startGroup("Downloading server jar");
  await loaders[loader]({ mcVersion, userAgent, jarPath, serverDirectory, manifest });
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
