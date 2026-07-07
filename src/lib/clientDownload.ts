import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import * as core from "@actions/core";
import PQueue from "p-queue";
import { type AssetIndex, assetObjectPath, buildAssetObjectUrl } from "./assets.js";
import { tryRestoreCache, trySaveCache } from "./cache.js";
import { downloadToFile, verifySha1 } from "./download.js";

export interface LibraryDownload {
  url: string;
  relativePath: string;
  sha1?: string;
  size?: number;
  label: string;
}

export async function downloadAssets(
  clientDirectory: string,
  userAgent: string,
  assetIndex: { id: string; url: string; sha1: string },
  strategy: string,
  concurrency: number,
): Promise<void> {
  const indexesDir = join(clientDirectory, "assets", "indexes");
  mkdirSync(indexesDir, { recursive: true });
  const indexPath = join(indexesDir, `${assetIndex.id}.json`);
  const indexBytes = await downloadToFile(assetIndex.url, userAgent, indexPath);
  verifySha1(indexBytes, assetIndex.sha1, "Asset index");

  if (strategy === "skip") {
    core.info('asset-download-strategy is "skip": asset index downloaded, objects skipped');
    return;
  }

  const assetsDir = join(clientDirectory, "assets");
  const objectsDir = join(assetsDir, "objects");
  const cacheKey = `mc-client-assets-${assetIndex.id}`;
  const cacheHit = await tryRestoreCache([objectsDir], cacheKey);

  const index = JSON.parse(indexBytes.toString("utf8")) as AssetIndex;
  const objects = Object.entries(index.objects);
  const queue = new PQueue({ concurrency });
  let downloaded = 0;
  let completed = 0;

  const tasks = objects.map(([, { hash, size }]) =>
    queue.add(async () => {
      const destination = assetObjectPath(assetsDir, hash);
      if (!(existsSync(destination) && statSync(destination).size === size)) {
        mkdirSync(dirname(destination), { recursive: true });
        const bytes = await downloadToFile(buildAssetObjectUrl(hash), userAgent, destination);
        verifySha1(bytes, hash, "Asset object");
        downloaded += 1;
      }
      completed += 1;
      if (completed % 200 === 0) {
        core.info(`Processed ${completed}/${objects.length} asset objects...`);
      }
    }),
  );
  await Promise.all(tasks);
  core.info(`Downloaded ${downloaded}/${objects.length} asset objects (rest already present/cached)`);

  if (!cacheHit) {
    await trySaveCache([objectsDir], cacheKey);
  }
}

export async function downloadLibraries(
  clientDirectory: string,
  userAgent: string,
  libraryDownloads: LibraryDownload[],
  cacheKey: string,
  concurrency: number,
): Promise<string[]> {
  const librariesDir = join(clientDirectory, "libraries");
  const cacheHit = await tryRestoreCache([librariesDir], cacheKey);

  const queue = new PQueue({ concurrency });
  const classpathEntries: string[] = ["client.jar", ...libraryDownloads.map((lib) => lib.relativePath)];
  const tasks = libraryDownloads.map((lib) =>
    queue.add(async () => {
      const destination = join(clientDirectory, lib.relativePath);
      if (existsSync(destination) && (lib.size === undefined || statSync(destination).size === lib.size)) {
        return;
      }
      mkdirSync(dirname(destination), { recursive: true });
      const bytes = await downloadToFile(lib.url, userAgent, destination);
      if (lib.sha1) {
        verifySha1(bytes, lib.sha1, lib.label);
      }
    }),
  );
  await Promise.all(tasks);
  core.info(`Downloaded ${libraryDownloads.length} libraries`);

  if (!cacheHit) {
    await trySaveCache([librariesDir], cacheKey);
  }
  return classpathEntries;
}
