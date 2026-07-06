import { readFileSync } from "node:fs";

export function readGradleProperty(propertiesPath: string, key: string): string | undefined {
  const contents = readFileSync(propertiesPath, "utf8");
  const prefix = `${key}=`;
  for (const line of contents.split(/\r?\n/)) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }
  return undefined;
}
