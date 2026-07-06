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

interface MojangVersionData {
  javaVersion: { majorVersion: number };
  downloads: { server?: { url: string; sha1: string; size: number } };
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

export async function getJavaVersionForMcVersion(
  manifest: MojangVersionManifest,
  mcVersion: string,
  userAgent: string,
): Promise<number> {
  const entry = findVersionEntry(manifest, mcVersion);
  if (!entry) {
    throw new Error(`Could not find Minecraft version ${mcVersion} in version manifest`);
  }
  const data = await fetchJson<MojangVersionData>(entry.url, userAgent);
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
  const entry = findVersionEntry(manifest, mcVersion);
  if (!entry) {
    throw new Error(`Could not find Minecraft version ${mcVersion} in version manifest`);
  }
  const data = await fetchJson<MojangVersionData>(entry.url, userAgent);
  if (!data.downloads.server) {
    throw new Error(`Minecraft version ${mcVersion} has no server download`);
  }
  return data.downloads.server;
}
