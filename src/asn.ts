import {
  statSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { fileURLToPath } from "url";
import { log } from "./utils/log.js";
import { pLimit } from "./utils/limit.js";
import { isValidCidr } from "./core/cidr.js";
import { fetchWithRetry } from "./utils/http.js";
import { resolve as resolvePath, dirname, basename } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(__dirname, "..");

interface AsnEntry {
  asn: number;
  name: string;
}

interface AsnCache {
  prefixes: string[];
  fetchedAt: string;
}

interface AsnResult {
  asn: number;
  name: string;
  prefixes: string[];
  source: "cache" | "bgpview" | "ripe" | "failed";
  error?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_DIR = resolvePath(ROOT, "cache");

/**
 * Парсит аргументы командной строки
 */
function parseArgs(argv: string[]): {
  configPath: string;
  outputPath: string;
  useCache: boolean;
} {
  let configPath = resolvePath(ROOT, "config/services.json");
  let outputPath = resolvePath(ROOT, "lists/zones/services-asn.zone");
  let useCache = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config") configPath = resolvePath(argv[++i] ?? "");
    else if (a === "--output") outputPath = resolvePath(argv[++i] ?? "");
    else if (a === "--no-cache") useCache = false;
  }
  return { configPath, outputPath, useCache };
}

/**
 * Загружает ASN из конфигурации
 */
function loadAsns(configPath: string): AsnEntry[] {
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (Array.isArray(raw)) return [];
  const obj = raw as { asns?: AsnEntry[] };
  return obj.asns ?? [];
}

/**
 * Возвращает путь к кэшу для ASN
 */
function cachePath(asn: number): string {
  return resolvePath(CACHE_DIR, `asn-${asn}.json`);
}

/**
 * Читает кэш для ASN
 */
function readCache(asn: number): string[] | null {
  const p = cachePath(asn);
  if (!existsSync(p)) return null;
  try {
    const stat = statSync(p);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    const data = JSON.parse(readFileSync(p, "utf8")) as AsnCache;
    return Array.isArray(data.prefixes) ? data.prefixes : null;
  } catch {
    return null;
  }
}

/**
 * Записывает кэш для ASN
 */
function writeCache(asn: number, prefixes: string[]): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const data: AsnCache = { prefixes, fetchedAt: new Date().toISOString() };
  writeFileSync(cachePath(asn), JSON.stringify(data, null, 2), "utf8");
}

/**
 * Fetches prefixes from BGPView
 */
async function fetchFromBgpview(asn: number): Promise<string[]> {
  const text = await fetchWithRetry(
    `https://api.bgpview.io/asn/${asn}/prefixes`,
    { timeoutMs: 8000, retries: 3 },
  );
  const json = JSON.parse(text) as {
    status?: string;
    data?: { ipv4_prefixes?: Array<{ prefix?: string }> };
  };
  if (json.status && json.status !== "ok") {
    throw new Error(`bgpview status=${json.status}`);
  }
  const list = json.data?.ipv4_prefixes ?? [];
  return list
    .map((p) => p.prefix ?? "")
    .filter((s) => s.length > 0 && isValidCidr(s));
}

/**
 * Получает префиксы из RIPE
 */
async function fetchFromRipe(asn: number): Promise<string[]> {
  const text = await fetchWithRetry(
    `https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${asn}`,
    { timeoutMs: 8000, retries: 3 },
  );
  const json = JSON.parse(text) as {
    data?: { prefixes?: Array<{ prefix?: string }> };
  };
  const list = json.data?.prefixes ?? [];
  return list
    .map((p) => p.prefix ?? "")
    .filter((s) => s.length > 0 && isValidCidr(s));
}

/**
 * Получает префиксы для ASN
 */
async function fetchAsn(
  entry: AsnEntry,
  useCache: boolean,
): Promise<AsnResult> {
  const { asn, name } = entry;

  if (useCache) {
    const cached = readCache(asn);
    if (cached) {
      log.info(`AS${asn} ${name}: загружено из кэша (${cached.length} CIDR)`);
      return { asn, name, prefixes: cached, source: "cache" };
    }
  }

  try {
    const prefixes = await fetchFromBgpview(asn);
    if (prefixes.length === 0) throw new Error("bgpview вернул пустой список");
    if (useCache) writeCache(asn, prefixes);
    log.ok(`AS${asn} ${name}: ${prefixes.length} CIDR получено`);
    return { asn, name, prefixes, source: "bgpview" };
  } catch (errBgp) {
    const bgpMsg = (errBgp as Error).message;
    try {
      const prefixes = await fetchFromRipe(asn);
      if (prefixes.length === 0) {
        log.warn(
          `AS${asn} ${name}: bgpview ${bgpMsg}, RIPE вернул пустой список`,
        );
        return {
          asn,
          name,
          prefixes: [],
          source: "failed",
          error: `bgpview ${bgpMsg}; ripe пусто`,
        };
      }
      if (useCache) writeCache(asn, prefixes);
      log.ok(`AS${asn} ${name}: ${prefixes.length} CIDR получено (RIPE)`);
      return { asn, name, prefixes, source: "ripe" };
    } catch (errRipe) {
      const ripeMsg = (errRipe as Error).message;
      log.warn(`AS${asn} ${name}: bgpview ${bgpMsg}, RIPE ${ripeMsg}`);
      return {
        asn,
        name,
        prefixes: [],
        source: "failed",
        error: `bgpview ${bgpMsg}; ripe ${ripeMsg}`,
      };
    }
  }
}

/**
 * Конвертирует CIDR в целое число
 */
function ipToInt(cidr: string): number {
  const ip = cidr.split("/")[0]!;
  return (
    ip.split(".").reduce((acc, o) => (acc << 8) | parseInt(o, 10), 0) >>> 0
  );
}

/**
 * Запускает ASN
 */
export async function runAsn(argv: string[] = process.argv.slice(2)): Promise<{
  ok: number;
  failed: number;
  cidrCount: number;
  outputPath: string;
}> {
  const { configPath, outputPath, useCache } = parseArgs(argv);

  const asns = loadAsns(configPath);
  if (asns.length === 0) {
    log.warn(
      `В ${basename(configPath)} нет секции asns, services-asn.zone будет пустым`,
    );
  } else {
    log.info(`ASN для загрузки: ${asns.length}`);
  }

  const results = await pLimit(
    asns.map((entry) => () => fetchAsn(entry, useCache)),
    3,
  );

  const allPrefixes = new Set<string>();
  for (const r of results) {
    for (const p of r.prefixes) allPrefixes.add(p);
  }

  const sorted = [...allPrefixes].sort((a, b) => ipToInt(a) - ipToInt(b));

  const okCount = results.filter((r) => r.source !== "failed").length;
  const failed = results.filter((r) => r.source === "failed").length;

  const header = [
    "# services-asn.zone - ASN-префиксы крупных российских сервисов",
    `# Обновлено: ${new Date().toISOString()}`,
    `# ASN: ${asns.length} | OK: ${okCount} | Failed: ${failed} | CIDR: ${sorted.length}`,
    "",
  ].join("\n");

  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outputPath, header + sorted.join("\n") + "\n", "utf8");

  log.ok(`Записано ${sorted.length} префиксов -> ${basename(outputPath)}`);

  return {
    ok: okCount,
    failed,
    cidrCount: sorted.length,
    outputPath,
  };
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("asn.ts") ||
  process.argv[1]?.endsWith("asn.js");

if (isMain) {
  runAsn().catch((err) => {
    log.error((err as Error).message);
    process.exit(1);
  });
}
