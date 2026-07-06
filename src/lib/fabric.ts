export interface FabricVersionEntry {
  version: string;
  stable: boolean;
}

export function findLatestStableFabricVersion(versions: FabricVersionEntry[]): string | undefined {
  return versions.find((v) => v.stable)?.version;
}

export function buildFabricServerJarUrl(mcVersion: string, loaderVersion: string, installerVersion: string): string {
  return `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/${installerVersion}/server/jar`;
}

async function fetchJson<T>(url: string, userAgent: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchFabricLoaderVersions(userAgent: string): Promise<FabricVersionEntry[]> {
  return fetchJson<FabricVersionEntry[]>("https://meta.fabricmc.net/v2/versions/loader", userAgent);
}

export function fetchFabricInstallerVersions(userAgent: string): Promise<FabricVersionEntry[]> {
  return fetchJson<FabricVersionEntry[]>("https://meta.fabricmc.net/v2/versions/installer", userAgent);
}
