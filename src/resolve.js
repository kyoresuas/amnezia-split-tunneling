import { fileURLToPath } from "url";
import { log } from "./utils/log.js";
import { promises as dns } from "dns";
import { readFileSync, writeFileSync } from "fs";
import { resolve as resolvePath, dirname, basename } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(__dirname, "..");

const args = process.argv.slice(2);

// Config path
let configPath = resolvePath(ROOT, "config/services.json");

// Output path
let outputPath = resolvePath(ROOT, "lists/zones/services.zone");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--config") configPath = resolvePath(args[++i]);
  if (args[i] === "--output") outputPath = resolvePath(args[++i]);
}

/**
 * DNS резолвинг
 */
async function resolveIPv4(domain) {
  try {
    return await dns.resolve4(domain);
  } catch {
    return [];
  }
}

const prefixCache = new Map();

/**
 * Запрос префикса из RIPE Stat API
 */
async function fetchPrefix(ip) {
  if (prefixCache.has(ip)) return prefixCache.get(ip);

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
    const prefix = res.ok ? ((await res.json())?.data?.prefix ?? null) : null;
    prefixCache.set(ip, prefix);
    return prefix;
  } catch {
    prefixCache.set(ip, null);
    return null;
  }
}

/**
 * Ограниченный параллелизм
 */
async function pLimit(fns, concurrency) {
  const results = new Array(fns.length);
  let i = 0;
  const worker = async () => {
    while (i < fns.length) {
      const idx = i++;
      results[idx] = await fns[idx]();
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const services = JSON.parse(readFileSync(configPath, "utf8"));
const domains = services.flatMap((s) =>
  s.domains.map((d) => ({ domain: d, name: s.name })),
);

log.info(`Сервисов: ${services.length} | Доменов: ${domains.length}`);
log.info("Резолвлю домены...");

const resolvedIPs = new Set();

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

const prefixes = new Set();

await pLimit(
  [...resolvedIPs].map((ip) => async () => {
    const prefix = await fetchPrefix(ip);
    if (prefix) prefixes.add(prefix);
  }),
  5,
);

log.ok(`Уникальных CIDR: ${prefixes.size}`);

/**
 * Сортировка и запись
 */
function ipToInt(cidr) {
  return (
    cidr
      .split("/")[0]
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

writeFileSync(outputPath, header + sorted.join("\n") + "\n", "utf8");
log.ok(`Записано ${sorted.length} префиксов -> ${basename(outputPath)}`);
