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

export interface FabricProfileLibrary {
  name: string;
  url: string;
  sha1?: string;
  size?: number;
}

export interface FabricProfile {
  id: string;
  inheritsFrom: string;
  mainClass: string;
  arguments: { game: string[]; jvm: string[] };
  libraries: FabricProfileLibrary[];
}

export function fetchFabricProfile(mcVersion: string, loaderVersion: string, userAgent: string): Promise<FabricProfile> {
  return fetchJson<FabricProfile>(
    `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`,
    userAgent,
  );
}

/**
 * Converts a Maven coordinate ("group:artifact:version[:classifier]") into the standard
 * Maven repository layout path ("group/with/slashes/artifact/version/artifact-version[-classifier].jar").
 */
export function mavenCoordinateToPath(coordinate: string): string {
  const [group, artifact, version, classifier] = coordinate.split(":");
  const groupPath = group.replace(/\./g, "/");
  const suffix = classifier ? `-${classifier}` : "";
  return `${groupPath}/${artifact}/${version}/${artifact}-${version}${suffix}.jar`;
}

export function buildFabricLibraryUrl(library: FabricProfileLibrary): string {
  const base = library.url.endsWith("/") ? library.url : `${library.url}/`;
  return base + mavenCoordinateToPath(library.name);
}
