/**
 * Natural/numeric-aware version comparison, equivalent to GNU `sort -V` for the
 * dotted-numeric (optionally suffixed) version strings this repo deals with.
 */
export function compareVersions(a: string, b: string): number {
  const tokenize = (v: string): (string | number)[] =>
    v.match(/\d+|\D+/g)?.map((t) => (/^\d+$/.test(t) ? Number(t) : t)) ?? [];

  const ta = tokenize(a);
  const tb = tokenize(b);
  const len = Math.max(ta.length, tb.length);

  for (let i = 0; i < len; i++) {
    const x = ta[i];
    const y = tb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === "number" && typeof y === "number") {
      if (x !== y) return x - y;
    } else {
      const xs = String(x);
      const ys = String(y);
      if (xs !== ys) return xs < ys ? -1 : 1;
    }
  }
  return 0;
}

export function versionGte(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0;
}

export function versionGt(a: string, b: string): boolean {
  return compareVersions(a, b) > 0;
}

export interface MavenRange {
  lowerBound?: string;
  upperBound?: string;
  lowerInclusive: boolean;
  upperInclusive: boolean;
}

/**
 * Parses the subset of Maven version-range syntax used in gradle.properties'
 * `minecraft_version_range`: `[X.Y.Z]`, `[X.Y,)`, `[X.Y,X.Z)`, `[X.Y,X.Z]`.
 * Returns null if the range doesn't match one of those forms.
 */
export function parseMavenRange(range: string): MavenRange | null {
  let match = range.match(/^\[([0-9.]+)\]$/);
  if (match) {
    return { lowerBound: match[1], upperBound: match[1], lowerInclusive: true, upperInclusive: true };
  }

  match = range.match(/^\[([0-9.]+),\)$/);
  if (match) {
    return { lowerBound: match[1], lowerInclusive: true, upperInclusive: false };
  }

  match = range.match(/^\[([0-9.]+),([0-9.]+)\)$/);
  if (match) {
    return { lowerBound: match[1], upperBound: match[2], lowerInclusive: true, upperInclusive: false };
  }

  match = range.match(/^\[([0-9.]+),([0-9.]+)\]$/);
  if (match) {
    return { lowerBound: match[1], upperBound: match[2], lowerInclusive: true, upperInclusive: true };
  }

  return null;
}

export function versionMatchesRange(version: string, range: MavenRange): boolean {
  if (range.lowerBound !== undefined) {
    const ok = range.lowerInclusive ? versionGte(version, range.lowerBound) : versionGt(version, range.lowerBound);
    if (!ok) return false;
  }
  if (range.upperBound !== undefined) {
    const ok = range.upperInclusive ? versionGte(range.upperBound, version) : versionGt(range.upperBound, version);
    if (!ok) return false;
  }
  return true;
}
