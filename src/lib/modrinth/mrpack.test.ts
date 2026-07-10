import { describe, expect, it } from "vitest";
import { isFileSupportedForEnvironment, type ModrinthIndexFile, overridesDirName } from "./mrpack.js";

function file(env?: ModrinthIndexFile["env"]): ModrinthIndexFile {
  return {
    path: "mods/example.jar",
    hashes: { sha1: "abc" },
    env,
    downloads: ["https://example.com/example.jar"],
    fileSize: 1,
  };
}

describe("isFileSupportedForEnvironment", () => {
  it("supports files with no env block on either side", () => {
    expect(isFileSupportedForEnvironment(file(undefined), "client")).toBe(true);
    expect(isFileSupportedForEnvironment(file(undefined), "server")).toBe(true);
  });

  it("supports a side with no entry in the env block", () => {
    expect(isFileSupportedForEnvironment(file({ client: "required" }), "server")).toBe(true);
  });

  it("supports required and optional files", () => {
    expect(isFileSupportedForEnvironment(file({ client: "required" }), "client")).toBe(true);
    expect(isFileSupportedForEnvironment(file({ client: "optional" }), "client")).toBe(true);
  });

  it("excludes files marked unsupported for that side", () => {
    expect(isFileSupportedForEnvironment(file({ client: "unsupported" }), "client")).toBe(false);
    expect(isFileSupportedForEnvironment(file({ client: "unsupported", server: "required" }), "server")).toBe(true);
  });
});

describe("overridesDirName", () => {
  it("maps environment to its overrides directory", () => {
    expect(overridesDirName("client")).toBe("client-overrides");
    expect(overridesDirName("server")).toBe("server-overrides");
  });
});
