/**
 * Derives the NeoForge version prefix from a Minecraft numeric version.
 *
 * - Old MC versions (1.x): NeoForge drops the leading "1." (e.g. MC 1.21.11 -> NeoForge 21.11.*)
 * - New MC versions (year-based, e.g. 26.x): MC releases are already MAJOR.MINOR[.PATCH],
 *   and NeoForge matches that numeric version directly, appending ".0." when MC has no
 *   patch component (e.g. MC 26.1 -> NeoForge 26.1.0.*, MC 26.1.2 -> NeoForge 26.1.2.*).
 */
export function deriveNeoForgePrefix(numericVersion: string): string {
  if (numericVersion.startsWith("1.")) {
    return `${numericVersion.slice(2)}.`;
  }
  if (/^\d+\.\d+$/.test(numericVersion)) {
    return `${numericVersion}.0.`;
  }
  return `${numericVersion}.`;
}

/**
 * Finds the latest stable (non-snapshot) NeoForge version for a given Minecraft version.
 */
export function findLatestNeoForgeVersion(versions: string[], numericMcVersion: string): string | undefined {
  const prefix = deriveNeoForgePrefix(numericMcVersion);
  return versions.filter((v) => v.startsWith(prefix) && !v.includes("+snapshot")).at(-1);
}

export function buildNeoForgeInstallerUrl(neoforgeVersion: string): string {
  return `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoforgeVersion}/neoforge-${neoforgeVersion}-installer.jar`;
}

async function fetchJson<T>(url: string, userAgent: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchNeoForgeVersions(userAgent: string): Promise<string[]> {
  const data = await fetchJson<{ versions: string[] }>(
    "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge",
    userAgent,
  );
  return data.versions;
}
