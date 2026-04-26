import { fileURLToPath } from "url";
import { log } from "./utils/log.js";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve as resolvePath, dirname, join } from "path";
import { contains, isValidCidr, ipToInt } from "./core/cidr.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(__dirname, "..");

const ZONES_DIR = resolvePath(ROOT, "lists/zones");
const BLACKLIST_PATH = resolvePath(ROOT, "config/blacklist.txt");
const SERVICES_PATH = resolvePath(ROOT, "config/services.json");
const CACHE_DIR = resolvePath(ROOT, "cache");

const DISABLED_ZONES = new Set(["kz.zone"]);

const ZONE_ORDER = [
  "ru.zone",
  "mobile.zone",
  "services.zone",
  "services-asn.zone",
  "cdn.zone",
  "custom.zone",
  "kz.zone",
];

interface AsnEntry {
  asn: number;
  name: string;
}

/**
 * Парсит зонный файл
 */
function parseZoneFile(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  const cidrs: string[] = [];
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (isValidCidr(line)) cidrs.push(line);
  }
  return cidrs;
}

/**
 * Парсит blacklist файл
 */
function parseBlacklistFile(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  const cidrs: string[] = [];
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.split("#")[0]!.trim();
    if (!line) continue;
    if (isValidCidr(line)) cidrs.push(line);
  }
  return cidrs;
}

/**
 * Загружает информацию о ASN
 */
function loadAsnInfo(): Map<number, string> {
  if (!existsSync(SERVICES_PATH)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(SERVICES_PATH, "utf8")) as unknown;
    if (Array.isArray(raw)) return new Map();
    const obj = raw as { asns?: AsnEntry[] };
    const map = new Map<number, string>();
    for (const a of obj.asns ?? []) map.set(a.asn, a.name);
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Ищет ASN для префикса
 */
function lookupAsn(prefix: string): { asn: number; name: string } | null {
  if (!existsSync(CACHE_DIR)) return null;
  const asnInfo = loadAsnInfo();
  let files: string[];
  try {
    files = readdirSync(CACHE_DIR);
  } catch {
    return null;
  }
  for (const f of files) {
    const m = /^asn-(\d+)\.json$/.exec(f);
    if (!m) continue;
    const asn = Number(m[1]);
    try {
      const data = JSON.parse(readFileSync(join(CACHE_DIR, f), "utf8")) as {
        prefixes?: string[];
      };
      if (data.prefixes?.includes(prefix)) {
        return { asn, name: asnInfo.get(asn) ?? `AS${asn}` };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Список зонных файлов
 */
function listZoneFiles(): string[] {
  if (!existsSync(ZONES_DIR)) return [];
  const files = readdirSync(ZONES_DIR).filter((f) => f.endsWith(".zone"));
  const ordered: string[] = [];
  for (const known of ZONE_ORDER) {
    if (files.includes(known)) ordered.push(known);
  }
  for (const f of files) {
    if (!ordered.includes(f)) ordered.push(f);
  }
  return ordered;
}

/**
 * Дополняет строку до нужной длины
 */
function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

/**
 * Запускает diff
 */
export function runDiff(ip: string): boolean {
  if (!ip) {
    log.error("Использование: tsx src/diff.ts <IP>");
    process.exit(1);
  }
  let _check: number;
  try {
    _check = ipToInt(ip);
  } catch {
    log.error(`Невалидный IP: ${ip}`);
    process.exit(1);
  }
  void _check;

  process.stdout.write(`\nПроверка IP ${ip}...\n\n`);

  const zoneFiles = listZoneFiles();
  let foundInActiveZone = false;

  for (const fname of zoneFiles) {
    const fpath = join(ZONES_DIR, fname);
    const cidrs = parseZoneFile(fpath);
    const disabled = DISABLED_ZONES.has(fname);

    if (disabled) {
      process.stdout.write(`  —  ${pad(fname, 18)} - отключена\n`);
      continue;
    }

    const match = contains(cidrs, ip);
    if (match) {
      foundInActiveZone = true;
      let extra = match;
      if (fname === "services-asn.zone") {
        const asn = lookupAsn(match);
        if (asn) extra = `${match}, AS${asn.asn} ${asn.name}`;
      }
      process.stdout.write(`  ✓  ${pad(fname, 18)} - найден (${extra})\n`);
    } else {
      process.stdout.write(`  ✗  ${pad(fname, 18)} - нет\n`);
    }
  }

  process.stdout.write("\n");

  const blacklist = parseBlacklistFile(BLACKLIST_PATH);
  const blMatch = contains(blacklist, ip);
  if (blMatch) {
    process.stdout.write(
      `  ✗  ${pad("blacklist", 18)} - ИСКЛЮЧЕН (совпадает с ${blMatch})\n`,
    );
  } else {
    process.stdout.write(`  ✓  ${pad("blacklist", 18)} - не исключен\n`);
  }

  process.stdout.write("\n");

  const willBeIncluded = foundInActiveZone && !blMatch;
  if (willBeIncluded) {
    process.stdout.write(`  → Будет в ru-bypass.json - ДА\n\n`);
  } else if (blMatch) {
    process.stdout.write(`  → Будет в ru-bypass.json - НЕТ\n\n`);
  } else {
    process.stdout.write(
      `  → Будет в ru-bypass.json - НЕТ (иностранный IP)\n\n`,
    );
  }

  return willBeIncluded;
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("diff.ts") ||
  process.argv[1]?.endsWith("diff.js");

if (isMain) {
  const ip = process.argv[2] ?? "";
  runDiff(ip);
}
