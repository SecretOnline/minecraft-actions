import * as core from "@actions/core";
import { fetchNeoForgeVersions, findLatestNeoForgeVersion, runNeoForgeInstaller } from "../../lib/loaders/neoforge.js";
import type { ServerLoaderContext } from "./types.js";

export async function setupNeoForgeServer(ctx: ServerLoaderContext): Promise<void> {
  const inputNeoForgeVersion = core.getInput("neoforge-version");
  const numericVersion = ctx.mcVersion.replace(/-(snapshot|pre|rc).*$/, "");

  const neoforgeVersion =
    inputNeoForgeVersion || findLatestNeoForgeVersion(await fetchNeoForgeVersions(ctx.userAgent), numericVersion);
  if (!neoforgeVersion) {
    throw new Error(`Could not find a NeoForge version for Minecraft ${ctx.mcVersion}`);
  }
  core.info(`NeoForge: ${neoforgeVersion}`);
  core.setOutput("neoforge-version", neoforgeVersion);

  // The NeoForge installer downloads the vanilla Minecraft jar itself and patches it in
  // place, producing run.sh/run.bat/user_jvm_args.txt rather than a plain server.jar.
  await runNeoForgeInstaller(neoforgeVersion, ctx.userAgent, ctx.serverDirectory, ["--installServer"]);
}
