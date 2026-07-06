import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import * as core from "@actions/core";
import { readGradleProperty } from "../lib/gradleProperties.js";
import { sendRconCommand } from "../lib/rcon.js";

const STATE_PID = "server-pid";
const GRACEFUL_STOP_TIMEOUT_MS = 10_000;

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
  const serverDirectory = core.getInput("server-directory") || ".";
  const javaArgs = core.getInput("java-args");
  const readyPattern = core.getInput("ready-pattern") || "Done (";
  const timeoutSeconds = Number(core.getInput("timeout-seconds") || "300");
  const logFile = core.getInput("log-file") || join(serverDirectory, "run-server.log");

  mkdirSync(serverDirectory, { recursive: true });

  const args = [...javaArgs.split(/\s+/).filter(Boolean), "-jar", "server.jar", "nogui"];
  const logFd = openSync(logFile, "w");
  const child = spawn("java", args, {
    cwd: serverDirectory,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);
  core.info(`Started java ${args.join(" ")} (pid ${child.pid}) in ${serverDirectory}`);

  let exited = false;
  let exitInfo = "";
  child.on("exit", (code, signal) => {
    exited = true;
    exitInfo = signal ? `signal ${signal}` : `exit code ${code}`;
  });

  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    if (exited) {
      core.setFailed(`Minecraft server exited before becoming ready (${exitInfo}):\n${readLogTail(logFile)}`);
      return;
    }
    if (readFileSync(logFile, "utf8").includes(readyPattern)) {
      core.saveState(STATE_PID, String(child.pid));
      core.setOutput("pid", String(child.pid));
      core.setOutput("log-file", logFile);
      child.unref();
      core.info("Minecraft server is ready");
      return;
    }
    await sleep(1000);
  }

  core.setFailed(`Minecraft server did not become ready within ${timeoutSeconds}s:\n${readLogTail(logFile)}`);
  child.kill("SIGKILL");
}

async function stop(): Promise<void> {
  const pidStr = core.getState(STATE_PID);
  if (!pidStr) {
    core.info("No running Minecraft server to stop");
    return;
  }
  const pid = Number(pidStr);
  const serverDirectory = core.getInput("server-directory") || ".";
  const propertiesPath = join(serverDirectory, "server.properties");
  const rconPort = Number(readGradleProperty(propertiesPath, "rcon.port") ?? "25575");
  const rconPassword = readGradleProperty(propertiesPath, "rcon.password") ?? "";

  try {
    await sendRconCommand("127.0.0.1", rconPort, rconPassword, "stop");
    core.info("Sent stop command via RCON");
  } catch (error) {
    core.warning(`Failed to send RCON stop command: ${error instanceof Error ? error.message : String(error)}`);
  }

  const deadline = Date.now() + GRACEFUL_STOP_TIMEOUT_MS;
  while (Date.now() < deadline && isAlive(pid)) {
    await sleep(500);
  }
  if (isAlive(pid)) {
    core.warning(`Minecraft server (pid ${pid}) still running after graceful stop, sending SIGKILL`);
    process.kill(pid, "SIGKILL");
  } else {
    core.info(`Minecraft server (pid ${pid}) stopped`);
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
