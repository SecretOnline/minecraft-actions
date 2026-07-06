import * as core from "@actions/core";
import { readGradleProperty } from "../../lib/gradleProperties.js";

function run(): void {
  const inputJavaVersion = core.getInput("java-version");
  const gradlePropertiesPath = core.getInput("gradle-properties") || "gradle.properties";

  let javaVersion = inputJavaVersion;
  if (!javaVersion) {
    javaVersion = readGradleProperty(gradlePropertiesPath, "java_version") ?? "";
    if (!javaVersion) {
      core.setFailed(`Could not find java_version in ${gradlePropertiesPath}`);
      return;
    }
  }

  core.setOutput("java-version", javaVersion);
}

try {
  run();
} catch (error: unknown) {
  core.setFailed(error instanceof Error ? error.message : String(error));
}
