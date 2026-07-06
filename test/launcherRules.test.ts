import { describe, expect, it } from "vitest";
import {
  evaluateRules,
  filterLibrariesForLinux,
  resolveArguments,
  substituteTemplate,
} from "../src/lib/launcherRules.js";
import type { MojangVersionData } from "../src/lib/mojang.js";
import fixture from "./fixtures/mc-version-26.2-trimmed.json";

const versionData = fixture as unknown as MojangVersionData;

describe("evaluateRules", () => {
  it("allows when there are no rules", () => {
    expect(evaluateRules(undefined, { features: {} })).toBe(true);
  });

  it("allows an os.name: linux rule", () => {
    expect(evaluateRules([{ action: "allow", os: { name: "linux" } }], { features: {} })).toBe(true);
  });

  it("disallows an os.name: windows-only rule (we're always linux)", () => {
    expect(evaluateRules([{ action: "allow", os: { name: "windows" } }], { features: {} })).toBe(false);
  });

  it("matches a features-gated rule only when the feature is set", () => {
    const rules = [{ action: "allow" as const, features: { is_quick_play_singleplayer: true } }];
    expect(evaluateRules(rules, { features: { is_quick_play_singleplayer: true } })).toBe(true);
    expect(evaluateRules(rules, { features: {} })).toBe(false);
  });

  it("lets the last matching rule win", () => {
    const rules = [
      { action: "allow" as const, os: { name: "linux" } },
      { action: "disallow" as const, os: { name: "linux" } },
    ];
    expect(evaluateRules(rules, { features: {} })).toBe(false);
  });
});

describe("substituteTemplate", () => {
  it("replaces known tokens", () => {
    expect(substituteTemplate("${a}-${b}", { a: "1", b: "2" })).toBe("1-2");
  });

  it("leaves unknown tokens untouched", () => {
    expect(substituteTemplate("${missing}", {})).toBe("${missing}");
  });
});

describe("resolveArguments (real MC 26.2 game args fixture)", () => {
  const baseVariables = {
    auth_player_name: "Player",
    version_name: "26.2",
    game_directory: "/client",
    assets_root: "/client/assets",
    assets_index_name: "32",
    auth_uuid: "uuid",
    auth_access_token: "token",
    clientid: "cid",
    auth_xuid: "xuid",
    version_type: "release",
    quickPlaySingleplayer: "MyWorld",
    quickPlayMultiplayer: "127.0.0.1:25565",
  };

  it("expands plain strings and omits feature-gated args when the feature is off", () => {
    const args = resolveArguments(versionData.arguments.game, baseVariables, { features: {} });
    expect(args).toContain("Player");
    expect(args).not.toContain("--quickPlaySingleplayer");
    expect(args).not.toContain("--demo");
  });

  it("includes --quickPlaySingleplayer only when is_quick_play_singleplayer is set", () => {
    const args = resolveArguments(versionData.arguments.game, baseVariables, {
      features: { is_quick_play_singleplayer: true },
    });
    const index = args.indexOf("--quickPlaySingleplayer");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(args[index + 1]).toBe("MyWorld");
  });

  it("includes --quickPlayMultiplayer only when is_quick_play_multiplayer is set", () => {
    const args = resolveArguments(versionData.arguments.game, baseVariables, {
      features: { is_quick_play_multiplayer: true },
    });
    const index = args.indexOf("--quickPlayMultiplayer");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(args[index + 1]).toBe("127.0.0.1:25565");
  });

  it("expands string[] values from the jvm args (classpath)", () => {
    const args = resolveArguments(versionData.arguments.jvm, { ...baseVariables, natives_directory: "/n", classpath: "/a.jar:/b.jar", launcher_name: "x", launcher_version: "1" }, { features: {} });
    expect(args).toContain("-cp");
    expect(args).toContain("/a.jar:/b.jar");
    // os.name: windows/osx-gated jvm args must not appear on our fixed-linux target
    expect(args).not.toContain("-XstartOnFirstThread");
  });
});

describe("filterLibrariesForLinux (real MC 26.2 libraries fixture)", () => {
  it("keeps unconditional libraries and linux-gated natives, drops osx-only libraries", () => {
    const names = filterLibrariesForLinux(versionData.libraries).map((l) => l.name);
    expect(names).toContain("at.yawk.lz4:lz4-java:1.10.1");
    expect(names).toContain("com.mojang:jtracy:1.0.37:natives-linux");
    expect(names).not.toContain("ca.weblite:java-objc-bridge:1.1");
  });
});
