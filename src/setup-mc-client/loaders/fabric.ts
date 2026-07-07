import { join } from "node:path";
import * as core from "@actions/core";
import {
  buildFabricLibraryUrl,
  fetchFabricLoaderVersions,
  fetchFabricProfile,
  findLatestStableFabricVersion,
  mavenCoordinateToPath,
} from "../../lib/fabric.js";
import type { ClientLoaderContext, LoaderResult } from "./types.js";

export async function setupFabric(ctx: ClientLoaderContext): Promise<LoaderResult> {
  const inputLoaderVersion = core.getInput("fabric-loader-version");
  const loaderVersion =
    inputLoaderVersion || findLatestStableFabricVersion(await fetchFabricLoaderVersions(ctx.userAgent));
  if (!loaderVersion) {
    throw new Error("Could not find a stable Fabric Loader version");
  }
  core.info(`Fabric Loader: ${loaderVersion}`);
  core.setOutput("fabric-loader-version", loaderVersion);

  // Fabric's "profile" is a standard Mojang launcher version JSON with
  // inheritsFrom: <mcVersion> - it only overrides mainClass, adds a few extra
  // jvm/game args, and lists its own (pure-Java, no OS rules) libraries.
  const profile = await fetchFabricProfile(ctx.mcVersion, loaderVersion, ctx.userAgent);
  return {
    mainClass: profile.mainClass,
    extraJvmArgs: profile.arguments.jvm,
    extraGameArgs: profile.arguments.game,
    libraryDownloads: profile.libraries.map((library) => ({
      url: buildFabricLibraryUrl(library),
      relativePath: join("libraries", mavenCoordinateToPath(library.name)),
      sha1: library.sha1,
      size: library.size,
      label: library.name,
    })),
    cacheKeySuffix: `-fabric-${loaderVersion}`,
  };
}
