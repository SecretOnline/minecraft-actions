import { parse } from "smol-toml";

// v1 is Modrinth-only (see plan): no confirmed real-world example of a packwiz
// [update.curseforge] table exists to validate field names against, so it isn't parsed here.
export type PackwizPlatform = "modrinth";

export interface PackwizModEntry {
  name: string;
  filename: string;
  url: string;
  platform: PackwizPlatform;
  /** Modrinth project ID, as tracked in the mod's [update.modrinth] table. */
  trackedId: string;
  /** Modrinth version ID, as tracked in the mod's [update.modrinth] table. */
  trackedVersionId: string;
}

interface PackwizTomlShape {
  name?: string;
  filename?: string;
  download?: { url?: string };
  update?: {
    modrinth?: { "mod-id"?: string; version?: string };
  };
}

/**
 * Parses a single mods/*.pw.toml file's content into a PackwizModEntry.
 * Returns undefined for mods with no [update.modrinth] block (e.g. manually added files,
 * or files tracked against a different platform) since those aren't re-pinnable in v1.
 */
export function parsePackwizModToml(tomlContent: string): PackwizModEntry | undefined {
  const parsed = parse(tomlContent) as PackwizTomlShape;

  if (!parsed.name || !parsed.filename || !parsed.download?.url) {
    throw new Error("Malformed packwiz mod toml: missing name, filename, or download.url");
  }

  if (!parsed.update?.modrinth?.["mod-id"] || !parsed.update.modrinth.version) {
    return undefined;
  }

  return {
    name: parsed.name,
    filename: parsed.filename,
    url: parsed.download.url,
    platform: "modrinth",
    trackedId: parsed.update.modrinth["mod-id"],
    trackedVersionId: parsed.update.modrinth.version,
  };
}
