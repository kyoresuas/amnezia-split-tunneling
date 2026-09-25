import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Корень репозитория
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Пути внутри репозитория
 */
export const PathsContract = {
  ROOT,
  CONFIG_DIR: resolve(ROOT, "config"),
  SERVICES_DIR: resolve(ROOT, "config/services"),
  GUARD_FILE: resolve(ROOT, "config/guard.json"),
  EXCLUDE_FILE: resolve(ROOT, "config/exclude.txt"),
  DIST_DIR: resolve(ROOT, "dist"),
  CACHE_DIR: resolve(ROOT, "cache"),
  TOOLS_DIR: resolve(ROOT, ".tools"),
  SITE_DIR: resolve(ROOT, "site"),
} as const;
