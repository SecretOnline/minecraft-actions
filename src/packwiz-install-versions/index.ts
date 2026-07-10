import { spawnSync } from "node:child_process";
import * as core from "@actions/core";

export interface VersionPin {
  platform: "modrinth";
  mod: string;
  version: string;
}

function isVersionPin(value: unknown): value is VersionPin {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as VersionPin).platform === "modrinth" &&
    typeof (value as VersionPin).mod === "string" &&
    typeof (value as VersionPin).version === "string"
  );
}

function installVersion(pin: VersionPin, cwd: string): void {
  // `packwiz modrinth add --project-id <id> --version-id <id>` - verified against a real
  // packwiz install: passing a positional slug/project-id *and* --version-id together is
  // rejected ("--version-id cannot be used with a separately specified URL/slug/search term"),
  // so the project must be identified via --project-id only, not the positional argument.
  const args = ["modrinth", "add", "--project-id", pin.mod, "--version-id", pin.version, "--yes"];
  core.info(`Running: packwiz ${args.join(" ")}`);
  const result = spawnSync("packwiz", args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new Error(`Failed to run packwiz: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`packwiz ${args.join(" ")} exited with code ${result.status}`);
  }
}

async function run(): Promise<void> {
  const workingDirectory = core.getInput("working-directory") || ".";
  const versionsInput = core.getInput("versions", { required: true });

  const parsed: unknown = JSON.parse(versionsInput);
  if (!Array.isArray(parsed) || !parsed.every(isVersionPin)) {
    throw new Error(`"versions" input must be a JSON array of { platform: "modrinth", mod, version } triples`);
  }

  for (const pin of parsed) {
    installVersion(pin, workingDirectory);
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
