const DEFAULT_OPTIONS: Record<string, string> = {
  skipMultiplayerWarning: "true",
  onboardAccessibility: "false",
  joinedFirstServer: "true",
  tutorialStep: "none",
};

function parseOptions(text: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    result.set(trimmed.slice(0, separatorIndex).trim(), trimmed.slice(separatorIndex + 1).trim());
  }
  return result;
}

/**
 * Builds options.txt content from defaults that skip first-launch UI (the multiplayer
 * warning screen, accessibility onboarding, and tutorial toast) which would otherwise
 * block a headless client from ever reaching a joinable state, plus any user-supplied
 * overrides (in "key:value" lines, one per line - options.txt's own format). Overrides
 * win over defaults.
 */
export function buildClientOptions(overridesText: string): string {
  const merged = new Map(Object.entries(DEFAULT_OPTIONS));
  for (const [key, value] of parseOptions(overridesText)) {
    merged.set(key, value);
  }
  return (
    [...merged.entries()]
      .map(([key, value]) => `${key}:${value}`)
      .join("\n") + "\n"
  );
}
