import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildGoInstallEnv,
  NIGHTLY_LINK_URL,
  PACKWIZ_CACHE_KEY_PREFIX,
  PACKWIZ_SOURCE_BUILD_VERSION,
  PACKWIZ_TOOL_NAME,
  resolveGobinDir,
  resolvePackwizCacheDir,
} from "./packwiz.js";

describe("constants", () => {
  it("has the exact nightly.link URL", () => {
    expect(NIGHTLY_LINK_URL).toBe("https://nightly.link/packwiz/packwiz/workflows/go/main/Linux%2064-bit%20x86.zip");
  });

  it("has the expected tool name and source-build version", () => {
    expect(PACKWIZ_TOOL_NAME).toBe("packwiz");
    expect(PACKWIZ_SOURCE_BUILD_VERSION).toBe("0.0.0-source");
  });

  it("has the expected cache key prefix", () => {
    expect(PACKWIZ_CACHE_KEY_PREFIX).toBe("packwiz-download-cache-");
  });
});

describe("resolvePackwizCacheDir", () => {
  const originalXdgCacheHome = process.env.XDG_CACHE_HOME;

  afterEach(() => {
    if (originalXdgCacheHome === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = originalXdgCacheHome;
    }
  });

  it("uses XDG_CACHE_HOME when set", () => {
    process.env.XDG_CACHE_HOME = "/xdg/cache";
    expect(resolvePackwizCacheDir()).toBe(join("/xdg/cache", "packwiz", "cache"));
  });

  it("falls back to ~/.cache when XDG_CACHE_HOME is unset", () => {
    delete process.env.XDG_CACHE_HOME;
    expect(resolvePackwizCacheDir()).toBe(join(homedir(), ".cache", "packwiz", "cache"));
  });
});

describe("resolveGobinDir", () => {
  const originalRunnerTemp = process.env.RUNNER_TEMP;

  afterEach(() => {
    if (originalRunnerTemp === undefined) {
      delete process.env.RUNNER_TEMP;
    } else {
      process.env.RUNNER_TEMP = originalRunnerTemp;
    }
  });

  it("uses RUNNER_TEMP when set", () => {
    process.env.RUNNER_TEMP = "/runner/temp";
    expect(resolveGobinDir()).toBe(join("/runner/temp", "packwiz-gobin"));
  });

  it("falls back to os.tmpdir() when RUNNER_TEMP is unset", () => {
    delete process.env.RUNNER_TEMP;
    expect(resolveGobinDir()).toBe(join(tmpdir(), "packwiz-gobin"));
  });
});

describe("buildGoInstallEnv", () => {
  const originalGobin = process.env.GOBIN;

  beforeEach(() => {
    delete process.env.GOBIN;
  });

  afterEach(() => {
    if (originalGobin === undefined) {
      delete process.env.GOBIN;
    } else {
      process.env.GOBIN = originalGobin;
    }
  });

  it("sets GOBIN to the given directory without mutating process.env", () => {
    const env = buildGoInstallEnv("/some/gobin");
    expect(env.GOBIN).toBe("/some/gobin");
    expect(env).not.toBe(process.env);
    expect(process.env.GOBIN).toBeUndefined();
  });

  it("preserves other existing env vars", () => {
    process.env.SOME_OTHER_VAR = "kept";
    const env = buildGoInstallEnv("/some/gobin");
    expect(env.SOME_OTHER_VAR).toBe("kept");
    delete process.env.SOME_OTHER_VAR;
  });
});
