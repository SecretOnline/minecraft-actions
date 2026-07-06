import * as core from "@actions/core";
import { readGradleProperty } from "../lib/gradleProperties.js";
import { fetchVersionManifest, getJavaVersionForMcVersion } from "../lib/mojang.js";
import { parseMavenRange, versionMatchesRange } from "../lib/versionRange.js";

interface MatrixEntry {
  name: string;
  "minecraft-version": string;
  "java-version": number;
}

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });
  const gradlePropertiesPath = core.getInput("gradle-properties") || "gradle.properties";

  const mcVersion = readGradleProperty(gradlePropertiesPath, "minecraft_version");
  const mcVersionRange = readGradleProperty(gradlePropertiesPath, "minecraft_version_range");

  if (!mcVersion) {
    core.setFailed(`Could not find minecraft_version in ${gradlePropertiesPath}`);
    return;
  }

  const manifest = await fetchVersionManifest(userAgent);

  const singleVersionMatrix = async (version: string): Promise<MatrixEntry[]> => {
    const javaVersion = await getJavaVersionForMcVersion(manifest, version, userAgent);
    return [{ name: version, "minecraft-version": version, "java-version": javaVersion }];
  };

  // For snapshots/pre-releases, just test the single version.
  if (/-(snapshot|pre|rc)/.test(mcVersion)) {
    core.info(`Snapshot/pre-release detected, testing only ${mcVersion}`);
    core.setOutput("test-matrix", JSON.stringify(await singleVersionMatrix(mcVersion)));
    return;
  }

  core.info(`Release detected, finding versions matching range ${mcVersionRange}`);

  const range = mcVersionRange ? parseMavenRange(mcVersionRange) : null;
  if (!range) {
    core.warning(`Could not parse version range ${mcVersionRange}, falling back to minecraft_version`);
    core.setOutput("test-matrix", JSON.stringify(await singleVersionMatrix(mcVersion)));
    return;
  }

  let matchingVersions = manifest.versions
    .filter((v) => v.type === "release")
    .map((v) => v.id)
    .filter((id) => versionMatchesRange(id, range));

  if (matchingVersions.length === 0) {
    core.warning(`No release versions found matching range ${mcVersionRange}, falling back to minecraft_version`);
    matchingVersions = [mcVersion];
  }

  core.info(`Found ${matchingVersions.length} matching version(s): ${matchingVersions.join(", ")}`);

  const matrix: MatrixEntry[] = [];
  for (const version of matchingVersions) {
    const javaVersion = await getJavaVersionForMcVersion(manifest, version, userAgent);
    matrix.push({ name: version, "minecraft-version": version, "java-version": javaVersion });
  }

  core.setOutput("test-matrix", JSON.stringify(matrix));
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
