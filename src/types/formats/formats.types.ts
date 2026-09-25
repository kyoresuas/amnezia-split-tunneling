import { TierId } from "@/types/shared";

/**
 * Идентификатор формата
 */
export enum FormatId {
  AMNEZIA = "amnezia",
  AMNEZIA_DOMAINS = "amneziaDomains",
  IPV4 = "ipv4",
  IPV6 = "ipv6",
  DOMAINS = "domains",
  WIREGUARD = "wireguard",
  WIREGUARD_INVERTED = "wireguardInverted",
  SINGBOX_JSON = "singboxJson",
  SINGBOX_SRS = "singboxSrs",
  MIHOMO_MRS = "mihomoMrs",
  MIHOMO_YAML = "mihomoYaml",
  CLASH_CLASSICAL = "clashClassical",
  SURGE = "surge",
  QUANTUMULTX = "quantumultx",
  MIKROTIK = "mikrotik",
  MIKROTIK_IPV6 = "mikrotikIpv6",
  KEENETIC_BAT = "keeneticBat",
  KEENETIC_CLI = "keeneticCli",
  OPENWRT_NFT = "openwrtNft",
  DNSMASQ = "dnsmasq",
  WINDOWS_BAT = "windowsBat",
  LINUX_SH = "linuxSh",
  MACOS_SH = "macosSh",
  HAPP = "happ",
  V2RAYN = "v2rayn",
  GEOIP = "geoip",
  GEOSITE = "geosite",
}

/**
 * Группа клиентов для сайта и README
 */
export enum FormatGroup {
  AMNEZIA = "amnezia",
  WIREGUARD = "wireguard",
  SINGBOX = "singbox",
  XRAY = "xray",
  CLASH = "clash",
  SURGE = "surge",
  QUANTUMULTX = "quantumultx",
  MIKROTIK = "mikrotik",
  KEENETIC = "keenetic",
  OPENWRT = "openwrt",
  DESKTOP = "desktop",
  TEXT = "text",
}

export interface IFormat {
  id: FormatId;
  // Группа клиентов
  group: FormatGroup;
  // Короткое название файла для сайта
  title: string;
  // Что внутри и как применять
  description: string;
  // Файл общий для всех уровней
  shared: boolean;
  // Расширение или имя файла
  file: (tier: TierId) => string;
  // MIME-тип
  contentType: string;
  // Содержит IPv6
  ipv6: boolean;
  // Содержит домены
  domains: boolean;
  // Требует внешний бинарник
  tool?: "sing-box" | "mihomo";
}

export interface IFormatInput {
  // Идентификатор уровня
  tier: TierId;
  // Название уровня
  title: string;
  // Подсети IPv4
  ipv4: string[];
  // Подсети IPv6
  ipv6: string[];
  // Домены
  domains: string[];
  // Адреса каждого домена
  domainIps: Map<string, string[]>;
  // Дата сборки
  generatedAt: string;
}

export interface IFormatOutput {
  // Имя файла
  name: string;
  // Содержимое
  content: string | Buffer;
}
