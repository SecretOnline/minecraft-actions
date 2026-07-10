import type { MojangVersionManifest } from "../../lib/mojang/mojang.js";

export interface ServerLoaderContext {
  mcVersion: string;
  userAgent: string;
  jarPath: string;
  serverDirectory: string;
  manifest: MojangVersionManifest;
}
