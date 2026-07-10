import { createHash } from "node:crypto";

/**
 * Reimplements Java's `UUID.nameUUIDFromBytes(("OfflinePlayer:" + name).getBytes(UTF_8))`,
 * the algorithm vanilla servers use to derive a stable identity for offline-mode
 * (online-mode=false) players from just their username: MD5 the raw bytes (no RFC 4122
 * namespace prefix, unlike a standard UUIDv3), then set the version/variant bits.
 */
export function offlineUuidFromUsername(username: string): string {
  const digest = createHash("md5").update(`OfflinePlayer:${username}`, "utf8").digest();

  digest[6] = (digest[6] & 0x0f) | 0x30; // version 3
  digest[8] = (digest[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = digest.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}
