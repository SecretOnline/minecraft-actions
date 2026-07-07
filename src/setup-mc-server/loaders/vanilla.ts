import * as core from "@actions/core";
import { downloadToFile, verifySha1 } from "../../lib/download.js";
import { getServerDownloadForMcVersion } from "../../lib/mojang.js";
import type { ServerLoaderContext } from "./types.js";

export async function setupVanillaServer(ctx: ServerLoaderContext): Promise<void> {
  const download = await getServerDownloadForMcVersion(ctx.manifest, ctx.mcVersion, ctx.userAgent);
  const jarBytes = await downloadToFile(download.url, ctx.userAgent, ctx.jarPath);
  verifySha1(jarBytes, download.sha1, "Server jar");
  core.info(`Wrote ${ctx.jarPath} (${jarBytes.length} bytes)`);
}
