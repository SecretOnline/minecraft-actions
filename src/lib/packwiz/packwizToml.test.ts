import { describe, expect, it } from "vitest";
import { parsePackwizModToml } from "./packwizToml.js";

// Real shape taken from secrets-pack's mods/sodium.pw.toml.
const SODIUM_TOML = `
name = "Sodium"
filename = "sodium-fabric-0.8.12+mc1.21.11.jar"
side = "client"

[download]
url = "https://cdn.modrinth.com/data/AANobbMI/versions/NFkjnzWE/sodium-fabric-0.8.12%2Bmc1.21.11.jar"
hash-format = "sha512"
hash = "17fdb8240670d069e9bb4d00cd3d17afe28ea3f7ea7daf27fd32844f302516e7a889686429db81f2c7b73ad4afce703cac8963a8c3943cfebf45d2c570bd8256"

[update]
[update.modrinth]
mod-id = "AANobbMI"
version = "NFkjnzWE"
`;

describe("parsePackwizModToml", () => {
  it("parses a Modrinth-tracked mod entry", () => {
    expect(parsePackwizModToml(SODIUM_TOML)).toEqual({
      name: "Sodium",
      filename: "sodium-fabric-0.8.12+mc1.21.11.jar",
      url: "https://cdn.modrinth.com/data/AANobbMI/versions/NFkjnzWE/sodium-fabric-0.8.12%2Bmc1.21.11.jar",
      platform: "modrinth",
      trackedId: "AANobbMI",
      trackedVersionId: "NFkjnzWE",
    });
  });

  it("returns undefined for a mod with no [update.modrinth] block", () => {
    const toml = `
name = "Manual Mod"
filename = "manual.jar"

[download]
url = "https://example.com/manual.jar"
hash-format = "sha512"
hash = "abc"
`;
    expect(parsePackwizModToml(toml)).toBeUndefined();
  });

  it("throws on a malformed toml missing required fields", () => {
    expect(() => parsePackwizModToml("name = \"Broken\"")).toThrow(/Malformed/);
  });
});
