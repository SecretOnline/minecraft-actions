import { describe, expect, it } from "vitest";
import { parseFabricModJson } from "../src/lib/fabricModJson.js";

describe("parseFabricModJson", () => {
  it("parses id, version, and a single-range depends entry", () => {
    const json = JSON.stringify({
      id: "voxy",
      version: "0.2.16-beta+1.21.11",
      depends: { sodium: ">=0.6.0" },
    });
    expect(parseFabricModJson(json)).toEqual({
      id: "voxy",
      version: "0.2.16-beta+1.21.11",
      depends: { sodium: ">=0.6.0" },
    });
  });

  it("joins array-valued depends ranges with || , matching the prior jq normalisation", () => {
    const json = JSON.stringify({
      id: "example",
      version: "1.0.0",
      depends: { fabricloader: ["<0.15", ">=0.16"] },
    });
    expect(parseFabricModJson(json).depends).toEqual({
      fabricloader: "<0.15 || >=0.16",
    });
  });

  it("defaults to an empty depends object when absent", () => {
    const json = JSON.stringify({ id: "example", version: "1.0.0" });
    expect(parseFabricModJson(json).depends).toEqual({});
  });

  it("throws on missing id or version", () => {
    expect(() => parseFabricModJson(JSON.stringify({ version: "1.0.0" }))).toThrow(/Malformed/);
    expect(() => parseFabricModJson(JSON.stringify({ id: "example" }))).toThrow(/Malformed/);
  });
});
