import semver from "semver";

/** Strips build metadata (the +... suffix) from a version string, as semver ranges never apply to it. */
export function stripBuildMetadata(version: string): string {
  return version.split("+")[0];
}

/**
 * npm's semver parser requires an explicit numeric prerelease identifier after a trailing "-"
 * (e.g. "1.0.0-0"), but Fabric/Maven-style version ranges can end a bound with a bare "-"
 * (e.g. "1.0.0-" to mean "1.0.0 and any of its prereleases"). Ported from the sed fix-up this
 * repo's precedessor check-fabric-compat action already applied before calling into semver.
 */
export function normalizeRangeForNpmSemver(range: string): string {
  return range.replace(/-(?=[ |]|$)/g, "-0");
}

/** Whether `version` satisfies a single declared range, after the same normalisation steps check-fabric-compat used. */
export function versionSatisfiesRange(version: string, range: string): boolean {
  const cleanVersion = stripBuildMetadata(version);
  const cleanRange = normalizeRangeForNpmSemver(range);
  return semver.satisfies(cleanVersion, cleanRange, { includePrerelease: true });
}

/**
 * Whether `version` satisfies every range in `ranges` simultaneously. Checking each range
 * independently (rather than building one combined range string) sidesteps npm-semver's range
 * grammar not supporting distribution of AND over an OR'd ("||") range set.
 */
export function versionSatisfiesAllRanges(version: string, ranges: string[]): boolean {
  return ranges.every((range) => versionSatisfiesRange(version, range));
}
