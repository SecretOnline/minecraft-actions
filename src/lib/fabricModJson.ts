/** Dependency ranges declared by a fabric.mod.json's `depends` block, keyed by mod ID. */
export type FabricModDepends = Record<string, string>;

export interface FabricModInfo {
  id: string;
  version: string;
  depends: FabricModDepends;
}

interface FabricModJsonShape {
  id?: string;
  version?: string;
  depends?: Record<string, string | string[]>;
}

/**
 * Parses the contents of a fabric.mod.json file. Array-valued depends entries
 * (multiple acceptable ranges) are normalised to a single " || "-joined range
 * string, matching the normalisation this repo's precedessor check-fabric-compat
 * action already applied via jq before evaluating them with semver.
 */
export function parseFabricModJson(jsonContent: string): FabricModInfo {
  const parsed = JSON.parse(jsonContent) as FabricModJsonShape;

  if (!parsed.id || !parsed.version) {
    throw new Error("Malformed fabric.mod.json: missing id or version");
  }

  const depends: FabricModDepends = {};
  for (const [dependencyId, range] of Object.entries(parsed.depends ?? {})) {
    depends[dependencyId] = Array.isArray(range) ? range.join(" || ") : range;
  }

  return { id: parsed.id, version: parsed.version, depends };
}
