import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DefaultArtifactClient } from "@actions/artifact";
import * as core from "@actions/core";

function takeScreenshot(
  display: string,
  xauthority: string,
  outputFile: string,
): void {
  const args = ["-display", display, "-window", "root", outputFile];
  core.info(`Running: import ${args.join(" ")}`);
  const result = spawnSync("import", args, {
    env: { ...process.env, XAUTHORITY: xauthority },
    stdio: ["ignore", "inherit", "pipe"],
  });
  if (result.error) {
    throw new Error(`Failed to run import: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `import ${args.join(" ")} exited with code ${result.status}: ${result.stderr.toString()}`,
    );
  }
}

async function run(): Promise<void> {
  const display = core.getInput("display", { required: true });
  const xauthority = core.getInput("xauthority", { required: true });
  const artifactName = core.getInput("artifact-name", { required: true });
  const addJobSummary = core.getInput("add-job-summary") === "true";

  const outputFile = join(tmpdir(), `${artifactName}.png`);
  takeScreenshot(display, xauthority, outputFile);

  const client = new DefaultArtifactClient();
  const response = await client.uploadArtifact(
    artifactName,
    [outputFile],
    tmpdir(),
    { skipArchive: true },
  );

  const responseId = String(response.id ?? "");
  if (response.id === undefined) {
    core.warning("Upload did not return an artifact id");
  }

  const artifactUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}/artifacts/${responseId}`;

  core.setOutput("artifact-id", String(response.id ?? ""));
  core.setOutput("url", artifactUrl);

  if (addJobSummary) {
    await core.summary.addImage(artifactUrl, artifactName).write();
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
