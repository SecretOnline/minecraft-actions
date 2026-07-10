import { describe, expect, it } from "vitest";
import { offlineUuidFromUsername } from "./offlineUuid.js";

const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("offlineUuidFromUsername", () => {
  it("produces a well-formed UUID with version 3 and the RFC 4122 variant set", () => {
    const uuid = offlineUuidFromUsername("Player");
    expect(uuid).toMatch(UUID_FORMAT);
    expect(uuid[14]).toBe("3");
    expect(["8", "9", "a", "b"]).toContain(uuid[19]);
  });

  it("is deterministic for the same username", () => {
    expect(offlineUuidFromUsername("Steve")).toBe(offlineUuidFromUsername("Steve"));
  });

  it("differs between usernames", () => {
    expect(offlineUuidFromUsername("Steve")).not.toBe(offlineUuidFromUsername("Alex"));
  });
});
