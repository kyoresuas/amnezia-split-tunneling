import { IDohProvider } from "@/types/network";

export interface IZoneSource {
  // Имя зоны
  name: string;
  // URL файла с подсетями по строке
  url: string;
  // Семейство адресов
  family: 4 | 6;
  // Без этой зоны сборка невозможна
  required: boolean;
}

/**
 * Внешние источники данных
 */
export const SourcesContract = {
  // Страна, чьё адресное пространство образует полный список
  COUNTRY: "RU",

  // RIPE Stat: официальные данные RIR, основной источник
  RIPE: {
    NETWORK_INFO: "https://stat.ripe.net/data/network-info/data.json",
    ANNOUNCED_PREFIXES:
      "https://stat.ripe.net/data/announced-prefixes/data.json",
    AS_OVERVIEW: "https://stat.ripe.net/data/as-overview/data.json",
    COUNTRY_RESOURCES:
      "https://stat.ripe.net/data/country-resource-list/data.json",
    WHOIS: "https://stat.ripe.net/data/whois/data.json",
  } as const,

  // Зеркало тех же данных RIR на случай недоступности RIPE Stat
  FALLBACK_ZONES: [
    {
      name: "ipdeny-ru-ipv4",
      url: "https://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone",
      family: 4,
      required: true,
    },
    {
      name: "ipdeny-ru-ipv6",
      url: "https://www.ipdeny.com/ipv6/ipaddresses/aggregated/ru-aggregated.zone",
      family: 6,
      required: false,
    },
  ] as readonly IZoneSource[],

  // DNS-over-HTTPS провайдеры в дополнение к системному резолверу
  DOH: [
    {
      name: "Google",
      url: "https://dns.google/resolve",
      headers: {},
    },
    {
      name: "Cloudflare",
      url: "https://cloudflare-dns.com/dns-query",
      headers: { Accept: "application/dns-json" },
    },
  ] as readonly IDohProvider[],

  // Бинарники для компиляции rule-set
  TOOLS: {
    SINGBOX: {
      repo: "SagerNet/sing-box",
      binary: "sing-box",
    },
    MIHOMO: {
      repo: "MetaCubeX/mihomo",
      binary: "mihomo",
    },
  } as const,
} as const;
