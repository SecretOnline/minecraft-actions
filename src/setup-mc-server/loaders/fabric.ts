import * as core from "@actions/core";
import { downloadToFile } from "../../lib/download.js";
import {
  buildFabricServerJarUrl,
  fetchFabricInstallerVersions,
  fetchFabricLoaderVersions,
  findLatestStableFabricVersion,
} from "../../lib/loaders/fabric.js";
import type { ServerLoaderContext } from "./types.js";

export async function setupFabricServer(ctx: ServerLoaderContext): Promise<void> {
  const inputLoaderVersion = core.getInput("fabric-loader-version");
  const inputInstallerVersion = core.getInput("fabric-installer-version");

  const loaderVersion =
    inputLoaderVersion || findLatestStableFabricVersion(await fetchFabricLoaderVersions(ctx.userAgent));
  if (!loaderVersion) {
    throw new Error("Could not find a stable Fabric Loader version");
  }
  const installerVersion =
    inputInstallerVersion || findLatestStableFabricVersion(await fetchFabricInstallerVersions(ctx.userAgent));
  if (!installerVersion) {
    throw new Error("Could not find a stable Fabric Installer version");
  }
  core.info(`Fabric Loader: ${loaderVersion}`);
  core.info(`Fabric Installer: ${installerVersion}`);
  core.setOutput("fabric-loader-version", loaderVersion);
  core.setOutput("fabric-installer-version", installerVersion);

  const url = buildFabricServerJarUrl(ctx.mcVersion, loaderVersion, installerVersion);
  const jarBytes = await downloadToFile(url, ctx.userAgent, ctx.jarPath);
  core.info(`Wrote ${ctx.jarPath} (${jarBytes.length} bytes)`);
}
