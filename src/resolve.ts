import { fileURLToPath } from "url";
import { log } from "./utils/log.js";
import { promises as dns } from "dns";
import { pLimit } from "./utils/limit.js";
import { isValidCidr } from "./core/cidr.js";
import { resolve as resolvePath, dirname, basename } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(__dirname, "..");

interface Service {
  name: string;
  domains: string[];
}

interface ConfigObject {
  services?: Service[];
  asns?: unknown[];
}

const args = process.argv.slice(2);

let configPath = resolvePath(ROOT, "config/services.json");
let outputPath = resolvePath(ROOT, "lists/zones/services.zone");

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--config") configPath = resolvePath(args[++i] ?? "");
  else if (a === "--output") outputPath = resolvePath(args[++i] ?? "");
}

/**
 * Резолвит IPv4 адрес
 */
async function resolveIPv4(domain: string): Promise<string[]> {
  try {
    return await dns.resolve4(domain);
  } catch {
    return [];
  }
}

const prefixCache = new Map<string, string | null>();

/**
 * Получает префикс из RIPE Stat API
 */
async function fetchPrefix(ip: string): Promise<string | null> {
  if (prefixCache.has(ip)) return prefixCache.get(ip) ?? null;
  try {
    const res = await fetch(
      `https://stat.ripe.net/data/network-info/data.json?resource=${ip}`,
      {
        headers: {
          "User-Agent":
            "amnezia-split-tunneling (github.com/kyoresuas/amnezia-split-tunneling)",
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      prefixCache.set(ip, null);
      return null;
    }
    const json = (await res.json()) as { data?: { prefix?: string } };
    const prefix = json?.data?.prefix ?? null;
    prefixCache.set(ip, prefix);
    return prefix;
  } catch {
    prefixCache.set(ip, null);
    return null;
  }
}

const raw = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
const services: Service[] = Array.isArray(raw)
  ? (raw as Service[])
  : ((raw as ConfigObject).services ?? []);

const domains = services.flatMap((s) =>
  s.domains.map((d) => ({ domain: d, name: s.name })),
);

log.info(`Сервисов: ${services.length} | Доменов: ${domains.length}`);
log.info("Резолвлю домены...");

const resolvedIPs = new Set<string>();

await pLimit(
  domains.map(({ domain, name }) => async () => {
    const ips = await resolveIPv4(domain);
    if (!ips.length) log.warn(`${name} / ${domain}: не резолвится`);
    for (const ip of ips) resolvedIPs.add(ip);
  }),
  20,
);

log.ok(`Уникальных IP: ${resolvedIPs.size}`);
log.info("Запрашиваю CIDR из RIPE Stat API...");

const prefixes = new Set<string>();

await pLimit(
  [...resolvedIPs].map((ip) => async () => {
    const prefix = await fetchPrefix(ip);
    if (prefix && isValidCidr(prefix)) prefixes.add(prefix);
  }),
  5,
);

log.ok(`Уникальных CIDR: ${prefixes.size}`);

function ipToInt(cidr: string): number {
  return (
    cidr
      .split("/")[0]!
      .split(".")
      .reduce((acc, o) => (acc << 8) | parseInt(o, 10), 0) >>> 0
  );
}

const sorted = [...prefixes].sort((a, b) => ipToInt(a) - ipToInt(b));

const header = [
  "# services.zone - CIDR российских сервисов",
  `# Обновлено: ${new Date().toISOString()}`,
  `# Сервисов: ${services.length} | Доменов: ${domains.length} | CIDR: ${sorted.length}`,
  "",
].join("\n");

const outDir = dirname(outputPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outputPath, header + sorted.join("\n") + "\n", "utf8");
log.ok(`Записано ${sorted.length} префиксов -> ${basename(outputPath)}`);
