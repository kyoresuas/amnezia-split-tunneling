import { fileURLToPath } from "url";
import { log } from "./utils/log.js";
import { promises as dns } from "dns";
import { pLimit } from "./utils/limit.js";
import { ipToInt, isValidCidr } from "./core/cidr.js";
import {
  type NetworkInfo,
  type ResolverMode,
  selectRoute,
} from "./core/route.js";
import { dirname, basename, resolve as resolvePath } from "path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolvePath(__dirname, "..");

interface Service {
  name: string;
  domains: string[];
  trustedAsns?: number[];
}

interface ResolverOptions {
  /** Режим выбора BGP-префикса */
  mode?: ResolverMode;
  /** Добавить Google и Cloudflare DoH */
  dnsOverHttps?: boolean;
}

interface ConfigObject {
  services?: Service[];
  asns?: unknown[];
  resolver?: ResolverOptions;
}

interface DohAnswer {
  type?: number;
  data?: string;
}

interface DohResponse {
  Answer?: DohAnswer[];
}

const DOH_PROVIDERS = [
  {
    url: "https://dns.google/resolve",
    headers: {} as Record<string, string>,
  },
  {
    url: "https://cloudflare-dns.com/dns-query",
    headers: { Accept: "application/dns-json" },
  },
];

const args = process.argv.slice(2);

let configPath = resolvePath(ROOT, "config/services.json");
let outputPath = resolvePath(ROOT, "lists/zones/services.zone");

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--config") configPath = resolvePath(args[++i] ?? "");
  else if (a === "--output") outputPath = resolvePath(args[++i] ?? "");
}

/**
 * Резолвит IPv4 через один DNS-over-HTTPS провайдер
 */
async function resolveDoh(
  domain: string,
  provider: (typeof DOH_PROVIDERS)[number],
): Promise<string[]> {
  try {
    const url = new URL(provider.url);
    url.searchParams.set("name", domain);
    url.searchParams.set("type", "A");
    const res = await fetch(url, {
      headers: provider.headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as DohResponse;
    return (json.Answer ?? [])
      .filter((answer) => answer.type === 1 && typeof answer.data === "string")
      .map((answer) => answer.data!)
      .filter((ip) => isValidCidr(`${ip}/32`));
  } catch {
    return [];
  }
}

/**
 * Резолвит IPv4 через системный DNS и, при необходимости, DoH
 */
async function resolveIPv4(
  domain: string,
  dnsOverHttps: boolean,
): Promise<string[]> {
  const ips = new Set<string>();
  const tasks: Array<Promise<string[]>> = [
    dns.resolve4(domain).catch(() => []),
  ];
  if (dnsOverHttps) {
    for (const provider of DOH_PROVIDERS) {
      tasks.push(resolveDoh(domain, provider));
    }
  }
  for (const list of await Promise.all(tasks)) {
    for (const ip of list) ips.add(ip);
  }
  return [...ips];
}

const prefixCache = new Map<string, NetworkInfo | null>();

/**
 * Получает префикс и origin ASN из RIPE Stat API
 */
async function fetchNetworkInfo(ip: string): Promise<NetworkInfo | null> {
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
    const json = (await res.json()) as {
      data?: { prefix?: string; asns?: Array<number | string> };
    };
    const info: NetworkInfo = {
      prefix: json.data?.prefix ?? null,
      asns: (json.data?.asns ?? [])
        .map(Number)
        .filter((asn) => Number.isInteger(asn) && asn > 0),
    };
    prefixCache.set(ip, info);
    return info;
  } catch {
    prefixCache.set(ip, null);
    return null;
  }
}

const raw = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
const configObject = Array.isArray(raw) ? null : (raw as ConfigObject);
const services: Service[] = Array.isArray(raw)
  ? (raw as Service[])
  : (configObject?.services ?? []);
const resolverOptions = configObject?.resolver ?? {};
const resolverMode = resolverOptions.mode ?? "prefix";
const dnsOverHttps = resolverOptions.dnsOverHttps ?? false;

const domains = services.flatMap((service) =>
  service.domains.map((domain) => ({ domain, service })),
);

log.info(`Сервисов: ${services.length} | Доменов: ${domains.length}`);
log.info(
  `Резолвлю домены (${dnsOverHttps ? "system + DoH" : "system DNS"})...`,
);

const resolved = new Map<string, Set<Service>>();

await pLimit(
  domains.map(({ domain, service }) => async () => {
    const ips = await resolveIPv4(domain, dnsOverHttps);
    if (!ips.length) log.warn(`${service.name} / ${domain}: не резолвится`);
    for (const ip of ips) {
      const owners = resolved.get(ip) ?? new Set<Service>();
      owners.add(service);
      resolved.set(ip, owners);
    }
  }),
  20,
);

log.ok(`Уникальных IP: ${resolved.size}`);
log.info("Запрашиваю CIDR и origin ASN из RIPE Stat API...");

const prefixes = new Set<string>();
let trustedPrefixes = 0;
let exactAddresses = 0;

await pLimit(
  [...resolved].map(([ip, owners]) => async () => {
    const info = await fetchNetworkInfo(ip);
    const trustedAsns = [...owners].flatMap(
      (service) => service.trustedAsns ?? [],
    );
    const selected = selectRoute(ip, info, trustedAsns, resolverMode);
    const cidr = selected.cidr;

    if (resolverMode === "trusted-prefix" && cidr) {
      if (selected.trustedPrefix) trustedPrefixes++;
      else exactAddresses++;
    }

    if (cidr && isValidCidr(cidr)) prefixes.add(cidr);
  }),
  8,
);

log.ok(`Уникальных CIDR: ${prefixes.size}`);
if (resolverMode === "trusted-prefix") {
  log.info(
    `Точные маршруты для общих/неизвестных ASN: ${exactAddresses} | доверенные префиксы: ${trustedPrefixes}`,
  );
}

const sorted = [...prefixes].sort(
  (a, b) => ipToInt(a.split("/")[0]!) - ipToInt(b.split("/")[0]!),
);

const header = [
  "# services.zone - CIDR российских сервисов",
  `# Обновлено: ${new Date().toISOString()}`,
  `# Режим: ${resolverMode} | Сервисов: ${services.length} | Доменов: ${domains.length} | CIDR: ${sorted.length}`,
  "",
].join("\n");

const outDir = dirname(outputPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outputPath, header + sorted.join("\n") + "\n", "utf8");
log.ok(`Записано ${sorted.length} префиксов -> ${basename(outputPath)}`);
