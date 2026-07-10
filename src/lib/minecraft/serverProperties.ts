const DEFAULT_PROPERTIES: Record<string, string> = {
  "online-mode": "false",
  "white-list": "false",
  "enable-rcon": "true",
  "rcon.port": "25575",
};

function parseProperties(text: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    result.set(trimmed.slice(0, separatorIndex).trim(), trimmed.slice(separatorIndex + 1).trim());
  }
  return result;
}

/**
 * Builds server.properties content from the built-in CI-friendly defaults, the
 * generated RCON password, and any user-supplied overrides (in "key=value" lines,
 * one per line). Overrides win over defaults.
 */
export function buildServerProperties(overridesText: string, rconPassword: string): string {
  const merged = new Map(Object.entries(DEFAULT_PROPERTIES));
  merged.set("rcon.password", rconPassword);
  for (const [key, value] of parseProperties(overridesText)) {
    merged.set(key, value);
  }
  return (
    [...merged.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n"
  );
}
