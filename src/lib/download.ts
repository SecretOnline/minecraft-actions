import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

export async function downloadToFile(url: string, userAgent: string, destination: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(destination, bytes);
  return bytes;
}

export function verifySha1(bytes: Buffer, expectedSha1: string, label: string): void {
  const actualSha1 = createHash("sha1").update(bytes).digest("hex");
  if (actualSha1 !== expectedSha1) {
    throw new Error(`${label} SHA-1 mismatch: expected ${expectedSha1}, got ${actualSha1}`);
  }
}
