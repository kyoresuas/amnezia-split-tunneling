import {
  ipToInt,
  subtract,
  aggregate,
  isValidCidr,
  isPrivateCidr,
} from "./core/cidr.js";
import { fileURLToPath } from "url";
import { log } from "./utils/log.js";
import { dirname, basename, resolve as resolvePath } from "path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(__dirname, "..");

interface CliOptions {
  inputs: string[];
  output: string;
  compact: boolean;
  blacklistPath: string | null;
  statsPath: string | null;
}

interface ZoneStats {
  cidrs: number;
}

interface Stats {
  generatedAt: string;
  finalCidrs: number;
  zones: Record<string, ZoneStats>;
  blacklist: { rules: number; subtracted: number };
  aggregation: { before: number; after: number; saved: number };
  diff: { added: number; removed: number };
}

/**
 * Парсит аргументы командной строки
 */
function parseArgs(argv: string[]): CliOptions {
  const inputs: string[] = [];
  let output = resolvePath(ROOT, "lists/ru-bypass.json");
  let compact = false;
  let blacklistPath: string | null = resolvePath(ROOT, "config/blacklist.txt");
  let statsPath: string | null = resolvePath(ROOT, "lists/stats.json");

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--output") output = resolvePath(argv[++i] ?? "");
    else if (a === "--compact") compact = true;
    else if (a === "--blacklist") blacklistPath = resolvePath(argv[++i] ?? "");
    else if (a === "--no-blacklist") blacklistPath = null;
    else if (a === "--stats") statsPath = resolvePath(argv[++i] ?? "");
    else if (a === "--no-stats") statsPath = null;
    else if (typeof a === "string" && !a.startsWith("-")) inputs.push(a);
  }

  return { inputs, output, compact, blacklistPath, statsPath };
}

/**
 * Парсит зонный файл
 */
function parseZone(filePath: string): string[] {
  const cidrs: string[] = [];
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (isValidCidr(line)) {
      cidrs.push(line);
    } else {
      log.warn(
        `Пропущена невалидная запись в ${basename(filePath)}: "${line}"`,
      );
    }
  }
  return cidrs;
}

/**
 * Парсит blacklist файл
 */
function parseBlacklist(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  const cidrs: string[] = [];
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.split("#")[0]!.trim();
    if (!line) continue;
    if (isValidCidr(line)) {
      cidrs.push(line);
    } else {
      log.warn(`Пропущена невалидная запись в blacklist: "${line}"`);
    }
  }
  return cidrs;
}

/**
 * Конвертирует CIDR в IP-адрес
 */
function cidrIp(cidr: string): number {
  return ipToInt(cidr.split("/")[0]!);
}

/**
 * Сортирует CIDR
 */
function sortCidrs(cidrs: string[]): string[] {
  return [...cidrs].sort((a, b) => {
    const ia = cidrIp(a);
    const ib = cidrIp(b);
    if (ia !== ib) return ia - ib;
    const pa = parseInt(a.split("/")[1]!, 10);
    const pb = parseInt(b.split("/")[1]!, 10);
    return pa - pb;
  });
}

/**
 * Читает старые хостнеймы
 */
function readOldHostnames(outputPath: string): Set<string> {
  if (!existsSync(outputPath)) return new Set();
  try {
    const data = JSON.parse(readFileSync(outputPath, "utf8")) as Array<{
      hostname?: string;
    }>;
    return new Set(data.map((d) => d.hostname ?? "").filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Сравнивает старые и новые хостнеймы
 */
function diff(
  oldSet: Set<string>,
  newList: string[],
): {
  added: number;
  removed: number;
} {
  const newSet = new Set(newList);
  let added = 0;
  let removed = 0;
  for (const c of newSet) if (!oldSet.has(c)) added++;
  for (const c of oldSet) if (!newSet.has(c)) removed++;
  return { added, removed };
}

/**
 * Запускает генерацию
 */
export async function runGenerate(
  argv: string[] = process.argv.slice(2),
): Promise<void> {
  const opts = parseArgs(argv);

  if (opts.inputs.length === 0) {
    log.error(
      "Использование: tsx src/generate.ts [--compact] [-o <output.json>] [--blacklist <path>] [--stats <path>] <input.zone> [...]",
    );
    process.exit(1);
  }

  const zoneStats: Record<string, ZoneStats> = {};
  const all: string[] = [];

  for (const input of opts.inputs) {
    const loaded = parseZone(input);
    log.info(`${basename(input)}: загружено ${loaded.length} CIDR`);
    zoneStats[basename(input)] = { cidrs: loaded.length };
    for (const c of loaded) all.push(c);
  }

  const beforeDedup = all.length;
  const dedup = [...new Set(all)];
  const dupRemoved = beforeDedup - dedup.length;
  if (dupRemoved > 0) log.info(`Удалено дубликатов: ${dupRemoved}`);

  const publicCidrs = dedup.filter((c) => !isPrivateCidr(c));
  const privateRemoved = dedup.length - publicCidrs.length;
  if (privateRemoved > 0) {
    log.info(`Удалено приватных/bogon-диапазонов: ${privateRemoved}`);
  }

  const aggBefore = publicCidrs.length;
  const aggregated = aggregate(publicCidrs);
  const aggAfter = aggregated.length;
  log.info(
    `Агрегация: ${aggBefore} -> ${aggAfter} (сэкономлено ${aggBefore - aggAfter})`,
  );

  let blacklistRules = 0;
  let subtracted = 0;
  let afterBlacklist = aggregated;
  if (opts.blacklistPath) {
    const bl = parseBlacklist(opts.blacklistPath);
    blacklistRules = bl.length;
    if (bl.length > 0) {
      const before = aggregated.length;
      afterBlacklist = subtract(aggregated, bl);
      subtracted = before - afterBlacklist.length;
      log.info(
        `Blacklist: применено ${blacklistRules} правил, вычтено ${subtracted}`,
      );
    }
  }

  const sorted = sortCidrs(afterBlacklist);

  const oldSet = readOldHostnames(opts.output);
  const diffStats = diff(oldSet, sorted);

  const result = sorted.map((cidr) => ({ hostname: cidr, ip: "" }));
  const json = opts.compact
    ? JSON.stringify(result)
    : JSON.stringify(result, null, 2);

  const outDir = dirname(opts.output);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(opts.output, json, "utf8");
  log.ok(`Записано ${result.length} записей -> ${basename(opts.output)}`);

  if (opts.statsPath) {
    const stats: Stats = {
      generatedAt: new Date().toISOString(),
      finalCidrs: sorted.length,
      zones: zoneStats,
      blacklist: { rules: blacklistRules, subtracted },
      aggregation: {
        before: aggBefore,
        after: aggAfter,
        saved: aggBefore - aggAfter,
      },
      diff: diffStats,
    };
    const statsDir = dirname(opts.statsPath);
    if (!existsSync(statsDir)) mkdirSync(statsDir, { recursive: true });
    writeFileSync(opts.statsPath, JSON.stringify(stats, null, 2), "utf8");
    log.ok(`Записано stats.json -> ${basename(opts.statsPath)}`);
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("generate.ts") ||
  process.argv[1]?.endsWith("generate.js");

if (isMain) {
  runGenerate().catch((err) => {
    log.error((err as Error).message);
    process.exit(1);
  });
}
