import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assetObjectPath, buildAssetObjectUrl } from "./assets.js";

const HASH = "981aab8147520cdc1f0d4a84f46c161929021fee";

describe("buildAssetObjectUrl", () => {
  it("builds the resources.download.minecraft.net URL keyed by the hash's first two hex chars", () => {
    expect(buildAssetObjectUrl(HASH)).toBe(`https://resources.download.minecraft.net/98/${HASH}`);
  });
});

describe("assetObjectPath", () => {
  it("builds the content-addressed local path under assets/objects", () => {
    expect(assetObjectPath("/client/assets", HASH)).toBe(join("/client/assets", "objects", "98", HASH));
  });
});
