import { describe, expect, it } from "vitest";
import { buildServerProperties } from "../src/lib/serverProperties.js";

describe("buildServerProperties", () => {
  it("applies CI-friendly defaults and the generated RCON password", () => {
    const result = buildServerProperties("", "hunter2");
    expect(result).toContain("online-mode=false\n");
    expect(result).toContain("white-list=false\n");
    expect(result).toContain("enable-rcon=true\n");
    expect(result).toContain("rcon.port=25575\n");
    expect(result).toContain("rcon.password=hunter2\n");
  });

  it("lets user overrides win over defaults", () => {
    const result = buildServerProperties("online-mode=true\nmotd=Test Server", "hunter2");
    expect(result).toContain("online-mode=true\n");
    expect(result).toContain("motd=Test Server\n");
  });

  it("ignores blank lines and comments in overrides", () => {
    const result = buildServerProperties("# a comment\n\nmotd=Test Server\n", "hunter2");
    expect(result).toContain("motd=Test Server\n");
    expect(result).not.toContain("# a comment");
  });
});
