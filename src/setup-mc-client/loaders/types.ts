import { join } from "node:path";
import type { LibraryDownload } from "../../lib/clientDownload.js";
import type { MojangArgumentEntry, MojangLibrary, MojangVersionData } from "../../lib/mojang.js";

export interface ClientLoaderContext {
  mcVersion: string;
  userAgent: string;
  clientDirectory: string;
  versionData: MojangVersionData;
}

export interface LoaderResult {
  mainClass?: string;
  extraJvmArgs: MojangArgumentEntry[];
  extraGameArgs: MojangArgumentEntry[];
  libraryDownloads: LibraryDownload[];
  cacheKeySuffix: string;
}

export interface ClientBuildState {
  mainClass?: string;
  jvmArgTemplate: MojangArgumentEntry[];
  gameArgTemplate: MojangArgumentEntry[];
  libraryDownloads: LibraryDownload[];
  cacheKey: string;
}

/**
 * Folds one loader's result onto the accumulated build state. Called once for the
 * vanilla baseline and, for non-vanilla loaders, a second time for the overlay -
 * library downloads and cache key suffixes accumulate, while mainClass/args are
 * appended/overridden by whichever loader ran last.
 */
export function applyLoaderResult(state: ClientBuildState, result: LoaderResult): ClientBuildState {
  return {
    mainClass: result.mainClass ?? state.mainClass,
    jvmArgTemplate: [...state.jvmArgTemplate, ...result.extraJvmArgs],
    gameArgTemplate: [...state.gameArgTemplate, ...result.extraGameArgs],
    libraryDownloads: [...state.libraryDownloads, ...result.libraryDownloads],
    cacheKey: state.cacheKey + result.cacheKeySuffix,
  };
}

export function libraryToDownload(library: MojangLibrary): LibraryDownload {
  const artifact = library.downloads.artifact;
  if (!artifact) {
    throw new Error(`Library ${library.name} has no artifact after filtering`);
  }
  return {
    url: artifact.url,
    relativePath: join("libraries", artifact.path),
    sha1: artifact.sha1,
    size: artifact.size,
    label: library.name,
  };
}
