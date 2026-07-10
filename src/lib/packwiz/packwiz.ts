import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export const NIGHTLY_LINK_URL = "https://nightly.link/packwiz/packwiz/workflows/go/main/Linux%2064-bit%20x86.zip";
export const PACKWIZ_TOOL_NAME = "packwiz";
export const PACKWIZ_SOURCE_BUILD_VERSION = "0.0.0-source";
export const PACKWIZ_CACHE_KEY_PREFIX = "packwiz-download-cache-";

export function resolveGobinDir(): string {
  return join(process.env.RUNNER_TEMP || tmpdir(), "packwiz-gobin");
}

/**
 * packwiz's own default download cache location (core.GetPackwizCache() ->
 * GetPackwizLocalCache(), unless overridden by a "cache.directory" config value packwiz
 * users would set themselves): os.UserCacheDir()/packwiz/cache, i.e.
 * $XDG_CACHE_HOME/packwiz/cache or ~/.cache/packwiz/cache on Linux. Mirrored here (rather
 * than read from packwiz itself, which isn't installed yet when this runs) so it can be
 * restored/saved via actions/cache around packwiz commands in later steps.
 */
export function resolvePackwizCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
  return join(base, "packwiz", "cache");
}

export function buildGoInstallEnv(gobinDir: string): NodeJS.ProcessEnv {
  return { ...process.env, GOBIN: gobinDir };
}

export type NightlyLinkResult = "downloaded" | "not-found" | "network-error";

/**
 * packwiz's own CI artifact on nightly.link expires 90 days after the last run on its
 * main branch, which happens often - a 404 here is an expected, common outcome, not an error.
 * A thrown fetch() (DNS/TLS/connection failure - common under local `act` runs whose Docker
 * networking differs from a real runner) is also treated as non-fatal here, distinctly from a
 * true 404, since either way the sensible next step is to fall back to the tool-cache/source-build
 * chain rather than fail the whole action.
 */
export async function tryDownloadNightlyLink(userAgent: string, destination: string): Promise<NightlyLinkResult> {
  let response: Response;
  try {
    response = await fetch(NIGHTLY_LINK_URL, { headers: { "User-Agent": userAgent } });
  } catch {
    return "network-error";
  }
  if (response.status === 404) {
    return "not-found";
  }
  if (!response.ok) {
    throw new Error(`Failed to download ${NIGHTLY_LINK_URL}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(destination, bytes);
  return "downloaded";
}

export function installPackwizFromSource(gobinDir: string): void {
  const result = spawnSync("go", ["install", "github.com/packwiz/packwiz@latest"], {
    env: buildGoInstallEnv(gobinDir),
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(`Failed to run "go install" - is Go installed on PATH (e.g. via actions/setup-go)? ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`go install exited with code ${result.status}`);
  }
}
