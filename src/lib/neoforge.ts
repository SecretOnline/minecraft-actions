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
