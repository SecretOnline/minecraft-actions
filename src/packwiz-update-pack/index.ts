import { spawnSync } from "node:child_process";
import * as core from "@actions/core";
import { type LoaderUpdate, type ModUpdate, parsePackwizUpdateLine } from "../lib/packwizUpdateOutput.js";

function runPackwiz(args: string[], cwd: string): string {
  const result = spawnSync("packwiz", args, { cwd, encoding: "utf8" });
  if (result.error) {
    throw new Error(`Failed to run packwiz: ${result.error.message}`);
  }
  core.info(result.stdout);
  if (result.status !== 0) {
    core.error(result.stderr);
    throw new Error(`packwiz ${args.join(" ")} exited with code ${result.status}`);
  }
  return result.stdout;
}

async function run(): Promise<void> {
  const workingDirectory = core.getInput("working-directory") || ".";

  core.startGroup("packwiz update --all --yes");
  const updateOutput = runPackwiz(["update", "--all", "--yes"], workingDirectory);
  core.endGroup();

  core.startGroup("packwiz migrate loader latest --yes");
  const migrateOutput = runPackwiz(["migrate", "loader", "latest", "--yes"], workingDirectory);
  core.endGroup();

  const updatedMods: ModUpdate[] = [];
  let loaderUpdate: LoaderUpdate | undefined;

  for (const line of [...updateOutput.split("\n"), ...migrateOutput.split("\n")]) {
    const parsed = parsePackwizUpdateLine(line);
    if (parsed && "mod" in parsed) {
      updatedMods.push(parsed.mod);
    } else if (parsed && "loader" in parsed) {
      loaderUpdate = parsed.loader;
    }
  }

  updatedMods.sort((a, z) => a.name.localeCompare(z.name, undefined, { sensitivity: "base" }));

  const hasUpdate = updatedMods.length > 0 || loaderUpdate !== undefined;
  core.setOutput("has-update", String(hasUpdate));
  core.setOutput("updated-mods", JSON.stringify(updatedMods));
  core.setOutput("loader-update", loaderUpdate ? JSON.stringify(loaderUpdate) : "");
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
