import { chunk } from "@/utils/primitive";
import { IpFamily } from "@/types/shared";
import { RepositoryContract } from "@/contracts/repository";
import { invert, parseCidr, prefixToMask } from "@/helpers/cidr";
import { FormatId, IFormatInput, FormatWriter } from "@/types/formats";

/**
 * Функция, превращающая данные уровня в содержимое файла
 */

/**
 * Заголовок текстового файла с комментариями
 */
const header = (input: IFormatInput, prefix: string): string[] => [
  `${prefix} ${RepositoryContract.TITLE} ${input.tier}: российские подсети напрямую, мимо VPN`,
  `${prefix} Обновлено: ${input.generatedAt}`,
  `${prefix} ${RepositoryContract.URL}`,
];

/**
 * Имя набора для форматов, где дефис запрещён
 */
const setName = (tier: string): string => tier.replace(/-/g, "_");

/**
 * Первый адрес IPv4 из списка адресов домена
 */
const firstIpv4 = (ips: string[]): string | undefined =>
  ips.find((ip) => parseCidr(ip)?.family === IpFamily.V4);

/**
 * Только IPv4-адреса домена
 */
const onlyIpv4 = (ips: string[]): string[] =>
  ips.filter((ip) => parseCidr(ip)?.family === IpFamily.V4);

/**
 * AmneziaVPN: массив подсетей в формате импорта сайтов
 */
const amnezia: FormatWriter = (input, file) => ({
  name: file,
  content: JSON.stringify(
    input.ipv4.map((cidr) => ({ hostname: cidr, ip: "" })),
  ),
});

/**
 * AmneziaVPN: подсети плюс домены с адресами
 */
const amneziaDomains: FormatWriter = (input, file) => {
  const entries: Array<{ hostname: string; ips?: string[]; ip: string }> =
    input.ipv4.map((cidr) => ({ hostname: cidr, ip: "" }));

  for (const domain of input.domains) {
    const ips = onlyIpv4(input.domainIps.get(domain) ?? []);

    entries.push({ hostname: domain, ips, ip: firstIpv4(ips) ?? "" });
  }

  return { name: file, content: JSON.stringify(entries) };
};

/**
 * Подсети IPv4 по строке
 */
const ipv4: FormatWriter = (input, file) => ({
  name: file,
  content: input.ipv4.join("\n") + "\n",
});

/**
 * Подсети IPv6 по строке
 */
const ipv6: FormatWriter = (input, file) => ({
  name: file,
  content: input.ipv6.join("\n") + "\n",
});

/**
 * Домены по строке
 */
const domains: FormatWriter = (input, file) => ({
  name: file,
  content: input.domains.join("\n") + "\n",
});

/**
 * Строки AllowedIPs, по 50 подсетей в каждой
 */
const allowedIpsLines = (cidrs: string[]): string[] =>
  chunk(cidrs, 50).map((part) => `AllowedIPs = ${part.join(", ")}`);

/**
 * WireGuard: через туннель идут только российские подсети
 */
const wireguard: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      "# Вставьте строки в секцию [Peer] вместо AllowedIPs = 0.0.0.0/0",
      "# Через туннель пойдут только эти подсети",
      "",
      ...allowedIpsLines([...input.ipv4, ...input.ipv6]),
    ].join("\n") + "\n",
});

/**
 * WireGuard: через туннель идёт всё, кроме российских подсетей
 */
const wireguardInverted: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      "# Вставьте строки в секцию [Peer] вместо AllowedIPs = 0.0.0.0/0, ::/0",
      "# Через туннель пойдёт весь интернет, кроме российских подсетей",
      "",
      ...allowedIpsLines([
        ...invert(input.ipv4, IpFamily.V4),
        ...invert(input.ipv6, IpFamily.V6),
      ]),
    ].join("\n") + "\n",
});

/**
 * sing-box: исходный rule-set
 */
const singboxJson: FormatWriter = (input, file) => {
  const rules: Array<Record<string, string[]>> = [
    { ip_cidr: [...input.ipv4, ...input.ipv6] },
  ];

  if (input.domains.length > 0) rules.push({ domain_suffix: input.domains });

  return {
    name: file,
    content: JSON.stringify({ version: 1, rules }, null, 2) + "\n",
  };
};

/**
 * v2rayN и v2rayNG: набор правил маршрутизации
 */
const v2rayn: FormatWriter = (input, file) => ({
  name: file,
  content:
    JSON.stringify(
      [
        {
          remarks: `${RepositoryContract.TITLE} ${input.tier}`,
          outboundTag: "direct",
          domain: input.domains.map((domain) => `domain:${domain}`),
          ip: [...input.ipv4, ...input.ipv6],
          enabled: true,
        },
      ],
      null,
      2,
    ) + "\n",
});

/**
 * Happ: профиль маршрутизации
 */
const happ: FormatWriter = (input, file) => ({
  name: file,
  content:
    JSON.stringify(
      {
        Name: `${RepositoryContract.TITLE} ${input.tier}`,
        GlobalProxy: "true",
        RemoteDNSType: "DoH",
        RemoteDNSDomain: "https://dns.google/dns-query",
        RemoteDNSIP: "8.8.8.8",
        DomesticDNSType: "DoU",
        DomesticDNSDomain: "77.88.8.8",
        DomesticDNSIP: "77.88.8.8",
        Geoipurl: "",
        Geositeurl: "",
        LastUpdated: String(Math.floor(Date.parse(input.generatedAt) / 1000)),
        DnsHosts: {},
        UseDNSHosts: "false",
        DirectSites: input.domains,
        DirectIp: [...input.ipv4, ...input.ipv6],
        ProxySites: [],
        ProxyIp: [],
        BlockSites: [],
        BlockIp: [],
        DomainStrategy: "IPIfNonMatch",
        FakeDNS: "false",
      },
      null,
      2,
    ) + "\n",
});

/**
 * Clash и Mihomo: rule-provider с behavior ipcidr
 */
const mihomoYaml: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      "# behavior: ipcidr",
      "payload:",
      ...[...input.ipv4, ...input.ipv6].map((cidr) => `  - '${cidr}'`),
    ].join("\n") + "\n",
});

/**
 * Clash: rule-provider с behavior classical
 */
const clashClassical: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      "# behavior: classical",
      "payload:",
      ...input.ipv4.map((cidr) => `  - IP-CIDR,${cidr},no-resolve`),
      ...input.ipv6.map((cidr) => `  - IP-CIDR6,${cidr},no-resolve`),
      ...input.domains.map((domain) => `  - DOMAIN-SUFFIX,${domain}`),
    ].join("\n") + "\n",
});

/**
 * Surge, Shadowrocket, Loon: текстовый rule-set
 */
const surge: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      ...input.ipv4.map((cidr) => `IP-CIDR,${cidr},no-resolve`),
      ...input.ipv6.map((cidr) => `IP-CIDR6,${cidr},no-resolve`),
      ...input.domains.map((domain) => `DOMAIN-SUFFIX,${domain}`),
    ].join("\n") + "\n",
});

/**
 * Quantumult X: фильтр с политикой direct
 */
const quantumultx: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      ...input.ipv4.map((cidr) => `ip-cidr, ${cidr}, direct`),
      ...input.ipv6.map((cidr) => `ip6-cidr, ${cidr}, direct`),
      ...input.domains.map((domain) => `host-suffix, ${domain}, direct`),
    ].join("\n") + "\n",
});

/**
 * MikroTik: address-list IPv4
 */
const mikrotik: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      "# Импорт: /import file-name=" + file,
      "/ip firewall address-list",
      `remove [find list="${input.tier}"]`,
      ...input.ipv4.map((cidr) => `add list=${input.tier} address=${cidr}`),
    ].join("\n") + "\n",
});

/**
 * MikroTik: address-list IPv6
 */
const mikrotikIpv6: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "#"),
      "# Импорт: /import file-name=" + file,
      "/ipv6 firewall address-list",
      `remove [find list="${input.tier}"]`,
      ...input.ipv6.map((cidr) => `add list=${input.tier} address=${cidr}`),
    ].join("\n") + "\n",
});

/**
 * Keenetic: файл маршрутов для импорта через веб-интерфейс
 */
const keeneticBat: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...input.ipv4.map((cidr) => {
        const parsed = parseCidr(cidr)!;
        const network = cidr.split("/")[0]!;

        return `route ADD ${network} MASK ${prefixToMask(parsed.prefix)} 0.0.0.0`;
      }),
    ].join("\r\n") + "\r\n",
});

/**
 * Keenetic: команды консоли
 */
const keeneticCli: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      ...header(input, "!"),
      "! Замените ISP на имя интерфейса, через который должны идти российские подсети",
      ...input.ipv4.map((cidr) => `ip route ${cidr} ISP auto`),
    ].join("\n") + "\n",
});

/**
 * OpenWrt: элементы для наборов nftables
 */
const openwrtNft: FormatWriter = (input, file) => {
  const name = setName(input.tier);
  const lines = [
    ...header(input, "#"),
    `# Наборы: ${name} (ipv4_addr) и ${name}6 (ipv6_addr), flags interval`,
    `# Применение: nft -f ${file}`,
    `add set inet fw4 ${name} { type ipv4_addr; flags interval; auto-merge; }`,
    `add set inet fw4 ${name}6 { type ipv6_addr; flags interval; auto-merge; }`,
    `flush set inet fw4 ${name}`,
    `flush set inet fw4 ${name}6`,
  ];

  for (const part of chunk(input.ipv4, 500)) {
    lines.push(`add element inet fw4 ${name} { ${part.join(", ")} }`);
  }

  for (const part of chunk(input.ipv6, 500)) {
    lines.push(`add element inet fw4 ${name}6 { ${part.join(", ")} }`);
  }

  return { name: file, content: lines.join("\n") + "\n" };
};

/**
 * dnsmasq: доменная маршрутизация через nftset
 */
const dnsmasq: FormatWriter = (input, file) => {
  const name = setName(input.tier);

  return {
    name: file,
    content:
      [
        ...header(input, "#"),
        `# Требует dnsmasq-full и набор inet fw4 ${name}`,
        ...input.domains.map(
          (domain) => `nftset=/${domain}/4#inet#fw4#${name}`,
        ),
      ].join("\n") + "\n",
  };
};

/**
 * Windows: скрипт route add
 */
const windowsBat: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      "@echo off",
      `rem ${RepositoryContract.TITLE} ${input.tier}, обновлено ${input.generatedAt}`,
      `rem Запуск от администратора: ${file} <шлюз провайдера>`,
      'if "%~1"=="" (',
      `  echo Использование: ${file} ^<шлюз^>`,
      "  exit /b 1",
      ")",
      "set GW=%~1",
      ...input.ipv4.map((cidr) => {
        const parsed = parseCidr(cidr)!;
        const network = cidr.split("/")[0]!;

        return `route add ${network} mask ${prefixToMask(parsed.prefix)} %GW% metric 5`;
      }),
    ].join("\r\n") + "\r\n",
});

/**
 * Linux: пакетная загрузка маршрутов через ip -batch
 */
const linuxSh: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      "#!/bin/sh",
      ...header(input, "#"),
      `# Запуск: sh ${file} <шлюз IPv4> [шлюз IPv6]`,
      'GW="${1:?укажите шлюз IPv4}"',
      'GW6="${2:-}"',
      "ip -batch - <<EOF",
      ...input.ipv4.map((cidr) => `route add ${cidr} via $GW`),
      "EOF",
      '[ -n "$GW6" ] || exit 0',
      "ip -6 -batch - <<EOF",
      ...input.ipv6.map((cidr) => `route add ${cidr} via $GW6`),
      "EOF",
    ].join("\n") + "\n",
});

/**
 * macOS: скрипт route add
 */
const macosSh: FormatWriter = (input, file) => ({
  name: file,
  content:
    [
      "#!/bin/sh",
      ...header(input, "#"),
      `# Запуск: sudo sh ${file} <шлюз IPv4> [шлюз IPv6]`,
      'GW="${1:?укажите шлюз IPv4}"',
      'GW6="${2:-}"',
      ...input.ipv4.map((cidr) => `route -n add -net ${cidr} "$GW" >/dev/null`),
      '[ -n "$GW6" ] || exit 0',
      ...input.ipv6.map(
        (cidr) => `route -n add -inet6 -net ${cidr} "$GW6" >/dev/null`,
      ),
    ].join("\n") + "\n",
});

/**
 * Реестр текстовых генераторов. Бинарные форматы и общие файлы собираются отдельно
 */
export const FORMAT_WRITERS: Partial<Record<FormatId, FormatWriter>> = {
  [FormatId.AMNEZIA]: amnezia,
  [FormatId.AMNEZIA_DOMAINS]: amneziaDomains,
  [FormatId.IPV4]: ipv4,
  [FormatId.IPV6]: ipv6,
  [FormatId.DOMAINS]: domains,
  [FormatId.WIREGUARD]: wireguard,
  [FormatId.WIREGUARD_INVERTED]: wireguardInverted,
  [FormatId.SINGBOX_JSON]: singboxJson,
  [FormatId.V2RAYN]: v2rayn,
  [FormatId.HAPP]: happ,
  [FormatId.MIHOMO_YAML]: mihomoYaml,
  [FormatId.CLASH_CLASSICAL]: clashClassical,
  [FormatId.SURGE]: surge,
  [FormatId.QUANTUMULTX]: quantumultx,
  [FormatId.MIKROTIK]: mikrotik,
  [FormatId.MIKROTIK_IPV6]: mikrotikIpv6,
  [FormatId.KEENETIC_BAT]: keeneticBat,
  [FormatId.KEENETIC_CLI]: keeneticCli,
  [FormatId.OPENWRT_NFT]: openwrtNft,
  [FormatId.DNSMASQ]: dnsmasq,
  [FormatId.WINDOWS_BAT]: windowsBat,
  [FormatId.LINUX_SH]: linuxSh,
  [FormatId.MACOS_SH]: macosSh,
};
