import * as core from "@actions/core";
import { fetchVersionManifest, findVersionEntry } from "../lib/mojang.js";
import { deriveNeoForgePrefix } from "../lib/neoforge.js";
import { compareVersions } from "../lib/versionRange.js";

async function fetchText(url: string, userAgent: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return response.text();
}

async function fetchJson<T>(url: string, userAgent: string): Promise<T> {
  return JSON.parse(await fetchText(url, userAgent)) as T;
}

interface MojangVersionData {
  javaVersion: { majorVersion: number };
}

interface FabricLoaderVersion {
  version: string;
  stable: boolean;
}

interface NeoforgedVersions {
  versions: string[];
}

async function run(): Promise<void> {
  const userAgent = core.getInput("user-agent", { required: true });
  const inputMcVersion = core.getInput("minecraft-version");

  core.startGroup("Minecraft version");
  const manifest = await fetchVersionManifest(userAgent);
  const mcVersion = inputMcVersion || manifest.latest.release;
  if (!inputMcVersion) {
    core.info(`No version specified, using latest release: ${mcVersion}`);
  }

  const versionEntry = findVersionEntry(manifest, mcVersion);
  if (!versionEntry) {
    core.setFailed(`Could not find Minecraft version ${mcVersion} in version manifest`);
    return;
  }

  const versionData = await fetchJson<MojangVersionData>(versionEntry.url, userAgent);
  const javaVersion = versionData.javaVersion.majorVersion;

  // Extract numeric version (strip -snapshot-N, -preN, -rcN suffixes)
  const numericVersion = mcVersion.replace(/-(snapshot|pre|rc).*$/, "");

  core.info(`Minecraft version: ${mcVersion}`);
  core.info(`Numeric version: ${numericVersion}`);
  core.info(`Java version: ${javaVersion}`);
  core.endGroup();

  core.startGroup("Fabric Loader");
  const loaderVersions = await fetchJson<FabricLoaderVersion[]>(
    "https://meta.fabricmc.net/v2/versions/loader",
    userAgent,
  );
  const loaderVersion = loaderVersions.find((v) => v.stable)?.version;
  if (!loaderVersion) {
    core.setFailed("Could not find a stable Fabric Loader version");
    return;
  }
  core.info(`Fabric Loader: ${loaderVersion}`);
  core.endGroup();

  core.startGroup("Fabric API");
  const fabricMetadata = await fetchText(
    "https://maven.fabricmc.net/net/fabricmc/fabric-api/fabric-api/maven-metadata.xml",
    userAgent,
  );
  const fabricVersions = [...fabricMetadata.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1]);
  const fabricVersion = fabricVersions
    .filter((v) => v.endsWith(`+${numericVersion}`))
    .sort(compareVersions)
    .at(-1);
  if (!fabricVersion) {
    core.setFailed(`Could not find Fabric API version for Minecraft ${numericVersion}`);
    return;
  }
  core.info(`Fabric API: ${fabricVersion}`);
  core.endGroup();

  core.startGroup("NeoForge");
  const neoforgeData = await fetchJson<NeoforgedVersions>(
    "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge",
    userAgent,
  );

  const neoforgePrefix = deriveNeoForgePrefix(numericVersion);

  const snapshotMatch = mcVersion.match(/-snapshot-(\d+)$/);
  let neoforgeVersion: string | undefined;
  if (snapshotMatch) {
    const snapshotSuffix = `+snapshot-${snapshotMatch[1]}`;
    neoforgeVersion = neoforgeData.versions
      .filter((v) => v.startsWith(neoforgePrefix) && v.endsWith(snapshotSuffix))
      .at(-1);
  } else {
    neoforgeVersion = neoforgeData.versions
      .filter((v) => v.startsWith(neoforgePrefix) && !v.includes("+snapshot"))
      .at(-1);
  }
  if (!neoforgeVersion) {
    core.setFailed(`Could not find NeoForge version for Minecraft ${mcVersion}`);
    return;
  }
  core.info(`NeoForge: ${neoforgeVersion}`);
  core.endGroup();

  core.startGroup("NeoForm");
  const neoformData = await fetchJson<NeoforgedVersions>(
    "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoform",
    userAgent,
  );
  const neoformPrefix = `${mcVersion}-`;
  const neoformVersion = neoformData.versions.filter((v) => v.startsWith(neoformPrefix)).at(-1);
  if (!neoformVersion) {
    core.setFailed(`Could not find NeoForm version for Minecraft ${mcVersion}`);
    return;
  }
  core.info(`NeoForm: ${neoformVersion}`);
  core.endGroup();

  core.setOutput("minecraft-version", mcVersion);
  core.setOutput("java-version", javaVersion);
  core.setOutput("numeric-version", numericVersion);
  core.setOutput("fabric-loader-version", loaderVersion);
  core.setOutput("fabric-api-version", fabricVersion);
  core.setOutput("neoforge-version", neoforgeVersion);
  core.setOutput("neoform-version", neoformVersion);
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
