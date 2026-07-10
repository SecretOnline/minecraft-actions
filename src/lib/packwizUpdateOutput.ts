export interface ModUpdate {
  name: string;
  /** The mod's old and new jar filenames, as reported by packwiz - not clean version numbers (see below). */
  oldFile: string;
  newFile: string;
}

export interface LoaderUpdate {
  name: string;
  version: string;
}

const MOD_UPDATE_LINE = /^([^:]+)\s*:\s*(.+?)\s*->\s*(.+)$/;
const LOADER_UPDATE_LINE = /^Updated (.*) loader to version (.*)$/;

/**
 * Parses a single line of `packwiz update --all --yes` or `packwiz migrate loader latest --yes`
 * stdout. Returns the parsed mod/loader update, or undefined if the line isn't one of those two
 * shapes (most lines are progress bars/other chatter).
 *
 * Verified against a real packwiz run: a mod update line looks like
 * `Sodium: sodium-fabric-0.5.11+mc1.21.jar -> sodium-fabric-0.8.12+mc1.21.1.jar` - packwiz reports
 * old/new *filenames*, not clean version strings, unlike what secrets-pack's predecessor
 * update-modpack-mods action's field naming implied (and that action discarded these groups
 * entirely rather than surfacing them). A loader update line looks like
 * `Updated Fabric loader to version 0.19.3`, which does match the assumed shape.
 */
export function parsePackwizUpdateLine(line: string): { mod: ModUpdate } | { loader: LoaderUpdate } | undefined {
  const modMatch = MOD_UPDATE_LINE.exec(line);
  if (modMatch) {
    return { mod: { name: modMatch[1], oldFile: modMatch[2], newFile: modMatch[3] } };
  }

  const loaderMatch = LOADER_UPDATE_LINE.exec(line);
  if (loaderMatch) {
    return { loader: { name: loaderMatch[1], version: loaderMatch[2] } };
  }

  return undefined;
}
