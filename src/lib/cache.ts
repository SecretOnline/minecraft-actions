import * as cache from "@actions/cache";
import * as core from "@actions/core";

/**
 * Wraps @actions/cache so a cache-backend failure never fails the action - the cache
 * backend isn't available at all when running dist/index.js directly or via plain
 * `act` without --cache-server-path, so restore/save failures just mean "slower",
 * never "broken" (the download loops already skip-if-present by file size regardless
 * of how a file got there).
 */
export async function tryRestoreCache(paths: string[], key: string): Promise<boolean> {
  try {
    const restored = await cache.restoreCache(paths, key);
    core.info(restored ? `Cache hit for key "${key}"` : `Cache miss for key "${key}"`);
    return restored !== undefined;
  } catch (error) {
    core.warning(`Cache restore failed, continuing without it: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export async function trySaveCache(paths: string[], key: string): Promise<void> {
  try {
    await cache.saveCache(paths, key);
  } catch (error) {
    core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
