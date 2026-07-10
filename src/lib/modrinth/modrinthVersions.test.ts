import { describe, expect, it } from "vitest";
import { mapModrinthVersion } from "./modrinthVersions.js";

describe("mapModrinthVersion", () => {
  it("maps the real Modrinth API response shape to camelCase", () => {
    // Trimmed from a live GET /v2/project/AANobbMI/version response.
    const raw = {
      id: "KIRFiWG4",
      project_id: "AANobbMI",
      version_number: "mc1.21.1-0.8.12-fabric",
      date_published: "2026-07-06T17:19:52.471697Z",
      game_versions: ["1.21.1"],
      loaders: ["fabric"],
      files: [{ url: "https://cdn.modrinth.com/data/AANobbMI/versions/KIRFiWG4/sodium.jar", filename: "sodium.jar", primary: true }],
    };
    expect(mapModrinthVersion(raw)).toEqual({
      id: "KIRFiWG4",
      projectId: "AANobbMI",
      versionNumber: "mc1.21.1-0.8.12-fabric",
      datePublished: "2026-07-06T17:19:52.471697Z",
      gameVersions: ["1.21.1"],
      loaders: ["fabric"],
      files: [{ url: "https://cdn.modrinth.com/data/AANobbMI/versions/KIRFiWG4/sodium.jar", filename: "sodium.jar", primary: true }],
    });
  });
});
