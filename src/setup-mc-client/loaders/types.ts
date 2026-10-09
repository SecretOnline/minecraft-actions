import { join } from "node:path";
import type { LibraryDownload } from "../../lib/minecraft/clientDownload.js";
import type {
  MojangArgumentEntry,
  MojangLibrary,
  MojangVersionData,
} from "../../lib/mojang/mojang.js";

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
  // relativePaths (as produced by libraryToDownload) that must still be downloaded onto
  // disk but left out of the "-cp" classpath string - e.g. NeoForge's bootstrap libraries,
  // which it puts on the JVM module path itself via a jvm-args "-p" entry.
  classpathExcludePaths?: string[];
  cacheKeySuffix: string;
}

export interface ClientBuildState {
  mainClass?: string;
  jvmArgTemplate: MojangArgumentEntry[];
  gameArgTemplate: MojangArgumentEntry[];
  libraryDownloads: LibraryDownload[];
  classpathExcludePaths: string[];
  cacheKey: string;
}

// A loader's `libraries` list, like a Mojang client version JSON, is only meaningful
// together with its "inheritsFrom" parent - entries are meant to be merged with the
// parent's, with the child's entry winning on conflicts. Neither NeoForge's installer
// output nor this code actually walks "inheritsFrom"; instead each loader's overlay
// libraries get concatenated onto the vanilla baseline positionally, so that merge has
// to happen here instead. It's a no-op when a loader's libraries are a true delta (no
// overlap with the baseline, e.g. newer NeoForge versions, or Fabric) - but for loaders
// whose profile re-lists the full parent library set (e.g. NeoForge on legacy 1.x
// Minecraft versions), skipping this dedup means the same jar reaching the classpath
// twice, which crashes securejarhandler's classpath union filesystem with a
// "Duplicate key" error at launch.
//
// Dedup by relativePath (the on-disk destination / classpath entry), NOT by groupId:
// artifactId - a single coordinate legitimately appears more than once with different
// classifiers, e.g. "org.lwjgl:lwjgl:3.3.3" (the jar) and
// "org.lwjgl:lwjgl:3.3.3:natives-linux" (its native library), which are different files
// at different relativePaths and must NOT be collapsed into one.
function dedupeLibraryDownloads(libraryDownloads: LibraryDownload[]): LibraryDownload[] {
  const byPath = new Map(libraryDownloads.map((library) => [library.relativePath, library]));
  return libraryDownloads.filter((library) => byPath.get(library.relativePath) === library);
}

/**
 * Folds one loader's result onto the accumulated build state. Called once for the
 * vanilla baseline and, for non-vanilla loaders, a second time for the overlay -
 * library downloads and cache key suffixes accumulate, while mainClass/args are
 * appended/overridden by whichever loader ran last.
 */
export function applyLoaderResult(
  state: ClientBuildState,
  result: LoaderResult,
): ClientBuildState {
  return {
    mainClass: result.mainClass ?? state.mainClass,
    jvmArgTemplate: [...state.jvmArgTemplate, ...result.extraJvmArgs],
    gameArgTemplate: [...state.gameArgTemplate, ...result.extraGameArgs],
    // The overlay's own entry for a given groupId:artifactId wins over the baseline's,
    // same as a real launcher resolving a child's "inheritsFrom" overrides.
    libraryDownloads: dedupeLibraryDownloads([...state.libraryDownloads, ...result.libraryDownloads]),
    classpathExcludePaths: [...state.classpathExcludePaths, ...(result.classpathExcludePaths ?? [])],
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
