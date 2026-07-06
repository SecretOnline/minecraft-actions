import { join } from "node:path";

export interface AssetIndex {
  objects: Record<string, { hash: string; size: number }>;
}

export function buildAssetObjectUrl(hash: string): string {
  return `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`;
}

export function assetObjectPath(assetsDir: string, hash: string): string {
  return join(assetsDir, "objects", hash.slice(0, 2), hash);
}
