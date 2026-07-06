import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import * as core from "@actions/core";
import { resolveArguments, substituteTemplate, type RuleContext } from "../lib/launcherRules.js";
import type { MojangArgumentEntry } from "../lib/mojang.js";
import { offlineUuidFromUsername } from "../lib/offlineUuid.js";

const STATE_PID = "client-pid";
const GRACEFUL_STOP_TIMEOUT_MS = 10_000;

interface LaunchConfig {
  mcVersion: string;
  mainClass: string;
  assetsIndexId: string;
  nativesDirectory: string;
  classpathEntries: string[];
  jvmArgTemplate: MojangArgumentEntry[];
  gameArgTemplate: MojangArgumentEntry[];
  logConfigArgument?: string;
  logConfigPath?: string;
}

function readLogTail(logFile: string, maxLines = 40): string {
  const lines = readFileSync(logFile, "utf8").split(/\r?\n/);
  return lines.slice(-maxLines).join("\n");
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  const clientDirectory = core.getInput("client-directory") || ".";
  const username = core.getInput("username") || "Player";
  const javaArgs = core.getInput("java-args");
  const singleplayerWorld = core.getInput("singleplayer-world");
  const serverAddress = core.getInput("server-address");
  const width = core.getInput("width");
  const height = core.getInput("height");
  const readyPattern = core.getInput("ready-pattern") || "advancements";
  const timeoutSeconds = Number(core.getInput("timeout-seconds") || "120");
  const logFile = core.getInput("log-file") || join(clientDirectory, "run-client.log");

  if (Boolean(singleplayerWorld) === Boolean(serverAddress)) {
    core.setFailed("Exactly one of singleplayer-world or server-address must be set");
    return;
  }

  const config = JSON.parse(readFileSync(join(clientDirectory, "launch-config.json"), "utf8")) as LaunchConfig;

  // java is spawned with cwd: clientDirectory below, so every path here is relative to
  // that directory - do NOT re-prefix with clientDirectory (that double-prefixes and
  // points -cp/etc. at nonexistent paths, which surfaces as a baffling
  // ClassNotFoundException for the main class itself, since nothing on the "classpath"
  // actually resolves).
  const variables: Record<string, string> = {
    auth_player_name: username,
    auth_uuid: offlineUuidFromUsername(username),
    auth_access_token: "0",
    clientid: "0",
    auth_xuid: "0",
    version_name: config.mcVersion,
    version_type: "release",
    // "legacy" (rather than "msa") since there's no real Microsoft account behind any
    // of this - only some MC versions' own game-arg templates reference this at all.
    user_type: "legacy",
    game_directory: ".",
    assets_root: "assets",
    assets_index_name: config.assetsIndexId,
    natives_directory: config.nativesDirectory,
    library_directory: "libraries",
    // Always linux - the only OS these actions run on (see launcherRules.ts).
    classpath_separator: ":",
    classpath: config.classpathEntries.join(":"),
    launcher_name: "minecraft-actions",
    launcher_version: "1",
    resolution_width: width,
    resolution_height: height,
    quickPlaySingleplayer: singleplayerWorld,
    quickPlayMultiplayer: serverAddress,
    quickPlayPath: "quickPlayLog.json",
    path: config.logConfigPath ?? "",
  };

  const context: RuleContext = {
    features: {
      is_quick_play_singleplayer: Boolean(singleplayerWorld),
      is_quick_play_multiplayer: Boolean(serverAddress),
      has_custom_resolution: Boolean(width && height),
    },
  };

  const jvmArgs = resolveArguments(config.jvmArgTemplate, variables, context);
  const gameArgs = resolveArguments(config.gameArgTemplate, variables, context);
  const extraJavaArgs = javaArgs.split(/\s+/).filter(Boolean);
  const logArg = config.logConfigArgument ? [substituteTemplate(config.logConfigArgument, variables)] : [];

  const args = [...jvmArgs, ...extraJavaArgs, ...logArg, config.mainClass, ...gameArgs];

  mkdirSync(clientDirectory, { recursive: true });
  const logFd = openSync(logFile, "w");
  const child = spawn("xvfb-run", ["-a", "java", ...args], {
    cwd: clientDirectory,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);
  core.info(`Started xvfb-run -a java ... (pid ${child.pid})`);

  let exited = false;
  let exitInfo = "";
  child.on("exit", (code, signal) => {
    exited = true;
    exitInfo = signal ? `signal ${signal}` : `exit code ${code}`;
  });

  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    if (exited) {
      core.setFailed(`Minecraft client exited before becoming ready (${exitInfo}):\n${readLogTail(logFile)}`);
      return;
    }
    if (readFileSync(logFile, "utf8").includes(readyPattern)) {
      core.saveState(STATE_PID, String(child.pid));
      core.setOutput("pid", String(child.pid));
      core.setOutput("log-file", logFile);
      child.unref();
      core.info("Minecraft client is ready");
      return;
    }
    await sleep(1000);
  }

  core.setFailed(`Minecraft client did not become ready within ${timeoutSeconds}s:\n${readLogTail(logFile)}`);
  child.kill("SIGKILL");
}

async function stop(): Promise<void> {
  const pidStr = core.getState(STATE_PID);
  if (!pidStr) {
    core.info("No running Minecraft client to stop");
    return;
  }
  const pid = Number(pidStr);

  process.kill(pid, "SIGTERM");

  const deadline = Date.now() + GRACEFUL_STOP_TIMEOUT_MS;
  while (Date.now() < deadline && isAlive(pid)) {
    await sleep(500);
  }
  if (isAlive(pid)) {
    core.warning(`Minecraft client (pid ${pid}) still running after graceful stop, sending SIGKILL`);
    process.kill(pid, "SIGKILL");
  } else {
    core.info(`Minecraft client (pid ${pid}) stopped`);
  }
}

async function run(): Promise<void> {
  if (core.getState("isPost")) {
    await stop();
    return;
  }
  core.saveState("isPost", "true");
  await start();
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
