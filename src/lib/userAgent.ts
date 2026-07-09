export function resolveUserAgent(actionName: string): string {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return `minecraft-actions/${actionName}`;
  }

  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  return `minecraft-actions/${actionName} (+${serverUrl}/${repository})`;
}
