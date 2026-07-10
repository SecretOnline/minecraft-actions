const API_BASE = "https://api.modrinth.com/v2";

export interface ModrinthVersionFile {
  url: string;
  filename: string;
  primary: boolean;
}

export interface ModrinthVersion {
  id: string;
  projectId: string;
  versionNumber: string;
  datePublished: string;
  gameVersions: string[];
  loaders: string[];
  files: ModrinthVersionFile[];
}

interface ModrinthVersionApiShape {
  id: string;
  project_id: string;
  version_number: string;
  date_published: string;
  game_versions: string[];
  loaders: string[];
  files: { url: string; filename: string; primary: boolean }[];
}

export function mapModrinthVersion(raw: ModrinthVersionApiShape): ModrinthVersion {
  return {
    id: raw.id,
    projectId: raw.project_id,
    versionNumber: raw.version_number,
    datePublished: raw.date_published,
    gameVersions: raw.game_versions,
    loaders: raw.loaders,
    files: raw.files.map((file) => ({ url: file.url, filename: file.filename, primary: file.primary })),
  };
}

export interface ModrinthVersionFilter {
  gameVersions?: string[];
  loaders?: string[];
}

/**
 * Lists a Modrinth project's versions, newest first (Modrinth's default ordering by
 * date_published, confirmed against the live API - see GET /v2/project/{id}/version).
 */
export async function listProjectVersions(
  projectId: string,
  filter: ModrinthVersionFilter,
  userAgent: string,
): Promise<ModrinthVersion[]> {
  const params = new URLSearchParams();
  if (filter.gameVersions?.length) {
    params.set("game_versions", JSON.stringify(filter.gameVersions));
  }
  if (filter.loaders?.length) {
    params.set("loaders", JSON.stringify(filter.loaders));
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const url = `${API_BASE}/project/${encodeURIComponent(projectId)}/version${query}`;

  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  const raw = (await response.json()) as ModrinthVersionApiShape[];
  return raw.map(mapModrinthVersion);
}
