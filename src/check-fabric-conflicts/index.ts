import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { downloadToFile } from "../lib/download.js";
import { parseFabricModJson } from "../lib/loaders/fabric.js";
import { listProjectVersions, type ModrinthVersion } from "../lib/modrinth/modrinthVersions.js";
import { parsePackwizModToml, type PackwizModEntry } from "../lib/packwiz/packwizToml.js";
import { versionSatisfiesAllRanges } from "../lib/version/semverRange.js";
import { resolveUserAgent } from "../lib/userAgent.js";

export interface ConflictFix {
  platform: "modrinth";
  mod: string;
  version: string;
}

/** Downloads a jar and extracts its fabric.mod.json content, or undefined if it isn't a Fabric mod. */
async function readFabricModJsonFromJar(url: string, userAgent: string): Promise<string | undefined> {
  const tempDir = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), "check-fabric-conflicts-"));
  try {
    const jarPath = join(tempDir, "mod.jar");
    await downloadToFile(url, userAgent, jarPath);
    const extractDir = join(tempDir, "extracted");
    await tc.extractZip(jarPath, extractDir);
    const fabricModJsonPath = join(extractDir, "fabric.mod.json");
    try {
      return readFileSync(fabricModJsonPath, "utf8");
    } catch {
      return undefined;
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function run(): Promise<void> {
  const workingDirectory = core.getInput("working-directory") || ".";
  const minecraftVersion = core.getInput("minecraft-version", { required: true });
  const loader = core.getInput("loader", { required: true });
  const maxVersionsToSearch = Number(core.getInput("max-versions-to-search") || "10");
  const userAgent = resolveUserAgent("check-fabric-conflicts");

  const modsDir = join(workingDirectory, "mods");
  const tomlFiles = readdirSync(modsDir).filter((name) => name.endsWith(".pw.toml"));

  core.startGroup("Reading installed mods");
  const modEntries: PackwizModEntry[] = [];
  for (const filename of tomlFiles) {
    const content = readFileSync(join(modsDir, filename), "utf8");
    const entry = parsePackwizModToml(content);
    if (entry) {
      modEntries.push(entry);
    }
  }
  core.info(`Found ${modEntries.length} Modrinth-tracked mod(s) out of ${tomlFiles.length} toml file(s)`);
  core.endGroup();

  core.startGroup("Downloading installed jars and reading fabric.mod.json");
  interface InstalledMod {
    entry: PackwizModEntry;
    version: string;
    depends: Record<string, string>;
  }
  const installed = new Map<string, InstalledMod>();
  for (const entry of modEntries) {
    const fabricModJson = await readFabricModJsonFromJar(entry.url, userAgent);
    if (!fabricModJson) {
      core.info(`Skipping ${entry.name} (not a Fabric mod)`);
      continue;
    }
    const info = parseFabricModJson(fabricModJson);
    installed.set(info.id, { entry, version: info.version, depends: info.depends });
  }
  core.endGroup();

  const dependedOnBy = new Map<string, string[]>();
  for (const { depends } of installed.values()) {
    for (const [dependencyId, range] of Object.entries(depends)) {
      if (!installed.has(dependencyId)) {
        continue; // Dependency isn't installed in this pack - nothing to check.
      }
      const ranges = dependedOnBy.get(dependencyId) ?? [];
      ranges.push(range);
      dependedOnBy.set(dependencyId, ranges);
    }
  }

  core.startGroup("Checking declared dependency ranges");
  const conflicts: ConflictFix[] = [];
  for (const [dependencyId, ranges] of dependedOnBy) {
    const target = installed.get(dependencyId);
    if (!target) {
      continue;
    }

    if (versionSatisfiesAllRanges(target.version, ranges)) {
      continue;
    }

    core.info(`${target.entry.name} (${target.version}) does not satisfy declared range(s): ${ranges.join(", ")}`);

    const candidates: ModrinthVersion[] = await listProjectVersions(
      target.entry.trackedId,
      { gameVersions: [minecraftVersion], loaders: [loader] },
      userAgent,
    );

    let fixed = false;
    for (const candidate of candidates.slice(0, maxVersionsToSearch)) {
      const file = candidate.files.find((f) => f.primary) ?? candidate.files[0];
      if (!file) {
        continue;
      }
      const candidateFabricModJson = await readFabricModJsonFromJar(file.url, userAgent);
      if (!candidateFabricModJson) {
        continue;
      }
      const candidateInfo = parseFabricModJson(candidateFabricModJson);
      if (versionSatisfiesAllRanges(candidateInfo.version, ranges)) {
        core.info(`Found compatible version ${candidateInfo.version} (${candidate.id}) for ${target.entry.name}`);
        conflicts.push({ platform: "modrinth", mod: target.entry.trackedId, version: candidate.id });
        fixed = true;
        break;
      }
    }

    if (!fixed) {
      core.warning(
        `No version of ${target.entry.name} within the first ${maxVersionsToSearch} Modrinth version(s) satisfies all declared ranges (${ranges.join(", ")}). Leaving it as-is.`,
      );
    }
  }
  core.endGroup();

  core.setOutput("has-conflicts", String(conflicts.length > 0));
  core.setOutput("conflicts", JSON.stringify(conflicts));
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
