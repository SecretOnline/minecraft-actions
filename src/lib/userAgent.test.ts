import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveUserAgent } from "./userAgent.js";

describe("resolveUserAgent", () => {
  const originalRepository = process.env.GITHUB_REPOSITORY;
  const originalServerUrl = process.env.GITHUB_SERVER_URL;

  beforeEach(() => {
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_SERVER_URL;
  });

  afterEach(() => {
    if (originalRepository === undefined) {
      delete process.env.GITHUB_REPOSITORY;
    } else {
      process.env.GITHUB_REPOSITORY = originalRepository;
    }
    if (originalServerUrl === undefined) {
      delete process.env.GITHUB_SERVER_URL;
    } else {
      process.env.GITHUB_SERVER_URL = originalServerUrl;
    }
  });

  it("derives a user agent from GITHUB_REPOSITORY and GITHUB_SERVER_URL", () => {
    process.env.GITHUB_REPOSITORY = "someone/somewhere";
    process.env.GITHUB_SERVER_URL = "https://github.example.com";
    expect(resolveUserAgent("get-test-matrix")).toBe(
      "minecraft-actions/get-test-matrix (+https://github.example.com/someone/somewhere)",
    );
  });

  it("defaults GITHUB_SERVER_URL to github.com when unset", () => {
    process.env.GITHUB_REPOSITORY = "someone/somewhere";
    expect(resolveUserAgent("get-test-matrix")).toBe(
      "minecraft-actions/get-test-matrix (+https://github.com/someone/somewhere)",
    );
  });

  it("falls back to a bare product token when GITHUB_REPOSITORY is unset", () => {
    expect(resolveUserAgent("get-test-matrix")).toBe("minecraft-actions/get-test-matrix");
  });
});
