import type { MojangVersionManifest } from "../../lib/mojang.js";

export interface ServerLoaderContext {
  mcVersion: string;
  userAgent: string;
  jarPath: string;
  serverDirectory: string;
  manifest: MojangVersionManifest;
}
