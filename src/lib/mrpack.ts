export interface ModrinthIndexFile {
  path: string;
  hashes: { sha1: string; [algorithm: string]: string };
  env?: { client?: string; server?: string };
  downloads: string[];
  fileSize: number;
}

export interface ModrinthIndex {
  formatVersion: number;
  game: string;
  versionId: string;
  name: string;
  files: ModrinthIndexFile[];
  dependencies: Record<string, string>;
}

export type MrpackEnvironment = "client" | "server";

// A file with no `env` block, or no entry for this side, is supported by default -
// the Modrinth spec only uses `env` to mark files as "unsupported" or "optional" for a side.
export function isFileSupportedForEnvironment(file: ModrinthIndexFile, environment: MrpackEnvironment): boolean {
  return file.env?.[environment] !== "unsupported";
}

export function overridesDirName(environment: MrpackEnvironment): string {
  return `${environment}-overrides`;
}
