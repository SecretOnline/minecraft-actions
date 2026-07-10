import { join } from "node:path";
import * as core from "@actions/core";
import { downloadToFile, verifySha1 } from "../../lib/download.js";
import { filterLibrariesForLinux } from "../../lib/mojang/launcherRules.js";
import { type ClientLoaderContext, type LoaderResult, libraryToDownload } from "./types.js";

export async function setupVanillaClient(ctx: ClientLoaderContext): Promise<LoaderResult> {
  const clientDownload = ctx.versionData.downloads.client;
  if (!clientDownload) {
    throw new Error(`Minecraft version ${ctx.mcVersion} has no client download`);
  }

  const clientJarBytes = await downloadToFile(
    clientDownload.url,
    ctx.userAgent,
    join(ctx.clientDirectory, "client.jar"),
  );
  verifySha1(clientJarBytes, clientDownload.sha1, "Client jar");
  core.info(`Wrote client.jar (${clientJarBytes.length} bytes)`);

  return {
    mainClass: ctx.versionData.mainClass,
    extraJvmArgs: ctx.versionData.arguments.jvm,
    extraGameArgs: ctx.versionData.arguments.game,
    libraryDownloads: filterLibrariesForLinux(ctx.versionData.libraries).map(libraryToDownload),
    cacheKeySuffix: "",
  };
}
