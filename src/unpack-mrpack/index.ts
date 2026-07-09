import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import PQueue from "p-queue";
import { downloadToFile, verifySha1 } from "../lib/download.js";
import {
  isFileSupportedForEnvironment,
  type ModrinthIndex,
  type MrpackEnvironment,
  overridesDirName,
} from "../lib/mrpack.js";
import { resolveUserAgent } from "../lib/userAgent.js";

async function run(): Promise<void> {
  const mrpackFile = core.getInput("mrpack-file", { required: true });
  const minecraftDirectory = core.getInput("minecraft-directory", { required: true });
  const userAgent = resolveUserAgent("unpack-mrpack");
  const environment = (core.getInput("environment") || "client") as MrpackEnvironment;
  const concurrency = Number(core.getInput("download-concurrency") || "8");

  if (environment !== "client" && environment !== "server") {
    core.setFailed(`Unknown environment "${environment}", expected "client" or "server"`);
    return;
  }

  const tempDir = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), "unpack-mrpack-"));
  try {
    core.startGroup("Extracting mrpack");
    await tc.extractZip(mrpackFile, tempDir);
    const index = JSON.parse(readFileSync(join(tempDir, "modrinth.index.json"), "utf8")) as ModrinthIndex;
    core.info(`Pack: ${index.name} (${index.versionId})`);
    core.endGroup();

    mkdirSync(minecraftDirectory, { recursive: true });

    core.startGroup("Downloading pack files");
    const files = index.files.filter((file) => isFileSupportedForEnvironment(file, environment));
    const skipped = index.files.length - files.length;
    if (skipped > 0) {
      core.info(`Skipping ${skipped} file(s) not supported for environment "${environment}"`);
    }

    const queue = new PQueue({ concurrency });
    const tasks = files.map((file) =>
      queue.add(async () => {
        const destination = join(minecraftDirectory, file.path);
        mkdirSync(dirname(destination), { recursive: true });
        const downloadUrl = file.downloads[0];
        const bytes = await downloadToFile(downloadUrl, userAgent, destination);
        if (bytes.length !== file.fileSize) {
          throw new Error(`File size mismatch for ${file.path}: expected ${file.fileSize}, got ${bytes.length}`);
        }
        verifySha1(bytes, file.hashes.sha1, file.path);
      }),
    );
    await Promise.all(tasks);
    core.info(`Downloaded ${files.length} file(s)`);
    core.endGroup();

    core.startGroup("Applying overrides");
    const overridesDir = join(tempDir, "overrides");
    if (existsSync(overridesDir)) {
      cpSync(overridesDir, minecraftDirectory, { recursive: true });
      core.info("Applied overrides");
    }
    const environmentOverridesDir = join(tempDir, overridesDirName(environment));
    if (existsSync(environmentOverridesDir)) {
      cpSync(environmentOverridesDir, minecraftDirectory, { recursive: true });
      core.info(`Applied ${overridesDirName(environment)}`);
    }
    core.endGroup();

    core.setOutput("minecraft-directory", minecraftDirectory);
    core.setOutput("minecraft-version", index.dependencies.minecraft);
    core.setOutput("dependencies", JSON.stringify(index.dependencies));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
