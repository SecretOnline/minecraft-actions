import { describe, expect, it } from "vitest";
import { buildClientOptions } from "./clientOptions.js";

describe("buildClientOptions", () => {
  it("applies the first-launch-UI-skipping defaults", () => {
    const result = buildClientOptions("");
    expect(result).toContain("skipMultiplayerWarning:true\n");
    expect(result).toContain("onboardAccessibility:false\n");
    expect(result).toContain("joinedFirstServer:true\n");
    expect(result).toContain("tutorialStep:none\n");
  });

  it("lets user overrides win over defaults", () => {
    const result = buildClientOptions("tutorialStep:movement\nsoundCategory_master:0.0");
    expect(result).toContain("tutorialStep:movement\n");
    expect(result).toContain("soundCategory_master:0.0\n");
  });

  it("ignores blank lines in overrides", () => {
    const result = buildClientOptions("\nsoundCategory_master:0.0\n");
    expect(result).toContain("soundCategory_master:0.0\n");
  });
});
