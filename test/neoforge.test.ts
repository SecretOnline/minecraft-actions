import { describe, expect, it } from "vitest";
import { deriveNeoForgePrefix } from "../src/lib/neoforge.js";

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
