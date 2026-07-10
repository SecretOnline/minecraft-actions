import { describe, expect, it } from "vitest";
import { buildNeoForgeInstallerUrl, deriveNeoForgePrefix, findLatestNeoForgeVersion } from "./neoforge.js";

describe("deriveNeoForgePrefix", () => {
  it("drops the leading '1.' for old-scheme MC versions", () => {
    expect(deriveNeoForgePrefix("1.21.4")).toBe("21.4.");
    expect(deriveNeoForgePrefix("1.21.11")).toBe("21.11.");
  });

  it("appends '.0.' for new-scheme two-part MC versions", () => {
    expect(deriveNeoForgePrefix("26.1")).toBe("26.1.0.");
  });

  it("appends '.' directly for new-scheme three-part MC versions", () => {
    expect(deriveNeoForgePrefix("26.1.2")).toBe("26.1.2.");
  });
});

describe("findLatestNeoForgeVersion", () => {
  it("picks the latest matching non-snapshot version, ignoring other MC versions", () => {
    const versions = ["21.4.109", "21.4.110", "21.4.111-beta", "21.5.1", "21.4.111+snapshot-20260101"];
    expect(findLatestNeoForgeVersion(versions, "1.21.4")).toBe("21.4.111-beta");
  });

  it("returns undefined when nothing matches", () => {
    expect(findLatestNeoForgeVersion(["21.5.1"], "1.21.4")).toBeUndefined();
  });
});

describe("buildNeoForgeInstallerUrl", () => {
  it("builds the maven.neoforged.net installer URL", () => {
    expect(buildNeoForgeInstallerUrl("21.4.111-beta")).toBe(
      "https://maven.neoforged.net/releases/net/neoforged/neoforge/21.4.111-beta/neoforge-21.4.111-beta-installer.jar",
    );
  });
});
