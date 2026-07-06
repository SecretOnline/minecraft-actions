import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import {
  buildFabricServerJarUrl,
  fetchFabricInstallerVersions,
  fetchFabricLoaderVersions,
  findLatestStableFabricVersion,
} from "../lib/fabric.js";
import { fetchVersionManifest, getServerDownloadForMcVersion } from "../lib/mojang.js";
import { buildNeoForgeInstallerUrl, fetchNeoForgeVersions, findLatestNeoForgeVersion } from "../lib/neoforge.js";
import { buildServerProperties } from "../lib/serverProperties.js";

async function downloadToFile(url: string, userAgent: string, destination: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(destination, bytes);
  return bytes;
}

async function setupVanillaServer(
  mcVersion: string,
  userAgent: string,
  jarPath: string,
  manifest: Awaited<ReturnType<typeof fetchVersionManifest>>,
): Promise<void> {
  const download = await getServerDownloadForMcVersion(manifest, mcVersion, userAgent);
  const jarBytes = await downloadToFile(download.url, userAgent, jarPath);
  const actualSha1 = createHash("sha1").update(jarBytes).digest("hex");
  if (actualSha1 !== download.sha1) {
    throw new Error(`Server jar SHA-1 mismatch: expected ${download.sha1}, got ${actualSha1}`);
  }
  core.info(`Wrote ${jarPath} (${jarBytes.length} bytes)`);
}

async function setupFabricServer(mcVersion: string, userAgent: string, jarPath: string): Promise<void> {
  const inputLoaderVersion = core.getInput("fabric-loader-version");
  const inputInstallerVersion = core.getInput("fabric-installer-version");

  const loaderVersion = inputLoaderVersion || findLatestStableFabricVersion(await fetchFabricLoaderVersions(userAgent));
  if (!loaderVersion) {
    throw new Error("Could not find a stable Fabric Loader version");
  }
  const installerVersion =
    inputInstallerVersion || findLatestStableFabricVersion(await fetchFabricInstallerVersions(userAgent));
  if (!installerVersion) {
    throw new Error("Could not find a stable Fabric Installer version");
  }
  core.info(`Fabric Loader: ${loaderVersion}`);
  core.info(`Fabric Installer: ${installerVersion}`);
  core.setOutput("fabric-loader-version", loaderVersion);
  core.setOutput("fabric-installer-version", installerVersion);

  const url = buildFabricServerJarUrl(mcVersion, loaderVersion, installerVersion);
  const jarBytes = await downloadToFile(url, userAgent, jarPath);
  core.info(`Wrote ${jarPath} (${jarBytes.length} bytes)`);
}

async function setupNeoForgeServer(mcVersion: string, userAgent: string, serverDirectory: string): Promise<void> {
  const inputNeoForgeVersion = core.getInput("neoforge-version");
  const numericVersion = mcVersion.replace(/-(snapshot|pre|rc).*$/, "");

  const neoforgeVersion =
    inputNeoForgeVersion || findLatestNeoForgeVersion(await fetchNeoForgeVersions(userAgent), numericVersion);
  if (!neoforgeVersion) {
    throw new Error(`Could not find a NeoForge version for Minecraft ${mcVersion}`);
  }
  core.info(`NeoForge: ${neoforgeVersion}`);
  core.setOutput("neoforge-version", neoforgeVersion);

  const installerPath = join(serverDirectory, "installer.jar");
  await downloadToFile(buildNeoForgeInstallerUrl(neoforgeVersion), userAgent, installerPath);

  // The NeoForge installer downloads the vanilla Minecraft jar itself and patches it in
  // place, producing run.sh/run.bat/user_jvm_args.txt rather than a plain server.jar.
  const result = spawnSync("java", ["-jar", "installer.jar", "--installServer"], {
    cwd: serverDirectory,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`NeoForge installer exited with code ${result.status}`);
  }
  unlinkSync(installerPath);
}

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
  if (loader === "vanilla") {
    await setupVanillaServer(mcVersion, userAgent, jarPath, manifest);
  } else if (loader === "fabric") {
    await setupFabricServer(mcVersion, userAgent, jarPath);
  } else {
    await setupNeoForgeServer(mcVersion, userAgent, serverDirectory);
  }
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
