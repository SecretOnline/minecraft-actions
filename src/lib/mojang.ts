const MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

export interface MojangVersionEntry {
  id: string;
  type: string;
  url: string;
}

export interface MojangVersionManifest {
  latest: { release: string; snapshot: string };
  versions: MojangVersionEntry[];
}

export interface MojangRule {
  action: "allow" | "disallow";
  os?: { name?: string; arch?: string; version?: string };
  features?: Record<string, boolean>;
}

export type MojangArgumentEntry = string | { rules: MojangRule[]; value: string | string[] };

export interface MojangLibrary {
  name: string;
  downloads: { artifact?: { path: string; url: string; sha1: string; size: number } };
  rules?: MojangRule[];
}

export interface MojangVersionData {
  javaVersion: { majorVersion: number };
  downloads: {
    server?: { url: string; sha1: string; size: number };
    client?: { url: string; sha1: string; size: number };
  };
  assetIndex: { id: string; url: string; sha1: string; size: number; totalSize: number };
  libraries: MojangLibrary[];
  mainClass: string;
  logging?: { client?: { argument: string; file: { id: string; url: string; sha1: string; size: number } } };
  arguments: { game: MojangArgumentEntry[]; jvm: MojangArgumentEntry[] };
}

async function fetchJson<T>(url: string, userAgent: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchVersionManifest(userAgent: string): Promise<MojangVersionManifest> {
  return fetchJson<MojangVersionManifest>(MANIFEST_URL, userAgent);
}

export function findVersionEntry(
  manifest: MojangVersionManifest,
  mcVersion: string,
): MojangVersionEntry | undefined {
  return manifest.versions.find((v) => v.id === mcVersion);
}

export async function getFullVersionData(
  manifest: MojangVersionManifest,
  mcVersion: string,
  userAgent: string,
): Promise<MojangVersionData> {
  const entry = findVersionEntry(manifest, mcVersion);
  if (!entry) {
    throw new Error(`Could not find Minecraft version ${mcVersion} in version manifest`);
  }
  return fetchJson<MojangVersionData>(entry.url, userAgent);
}

export async function getJavaVersionForMcVersion(
  manifest: MojangVersionManifest,
  mcVersion: string,
  userAgent: string,
): Promise<number> {
  const data = await getFullVersionData(manifest, mcVersion, userAgent);
  return data.javaVersion.majorVersion;
}

export interface ServerDownload {
  url: string;
  sha1: string;
  size: number;
}

export async function getServerDownloadForMcVersion(
  manifest: MojangVersionManifest,
  mcVersion: string,
  userAgent: string,
): Promise<ServerDownload> {
  const data = await getFullVersionData(manifest, mcVersion, userAgent);
  if (!data.downloads.server) {
    throw new Error(`Minecraft version ${mcVersion} has no server download`);
  }
  return data.downloads.server;
}

export interface ClientDownload {
  url: string;
  sha1: string;
  size: number;
}

export async function getClientDownloadForMcVersion(
  manifest: MojangVersionManifest,
  mcVersion: string,
  userAgent: string,
): Promise<ClientDownload> {
  const data = await getFullVersionData(manifest, mcVersion, userAgent);
  if (!data.downloads.client) {
    throw new Error(`Minecraft version ${mcVersion} has no client download`);
  }
  return data.downloads.client;
}
