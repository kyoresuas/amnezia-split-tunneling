import { it, expect, describe } from "vitest";
import { FormatsContract } from "@/contracts/formats";
import { FormatId, IFormatInput } from "@/types/formats";
import { FORMAT_WRITERS } from "@/services/formats/writers";

/**
 * Данные уровня для тестов
 */
const input: IFormatInput = {
  tier: "ru-lite",
  title: "ru-lite",
  ipv4: ["5.61.16.0/21", "87.250.250.0/24"],
  ipv6: ["2a02:6b8::/32"],
  domains: ["ozon.ru", "sberbank.ru"],
  domainIps: new Map([
    ["ozon.ru", ["185.73.193.68", "2a02:6b8::1"]],
    ["sberbank.ru", []],
  ]),
  generatedAt: "2026-09-25T00:00:00.000Z",
};

/**
 * Получить текст формата
 */
const render = (id: FormatId): string => {
  const format = FormatsContract.find((f) => f.id === id)!;
  const writer = FORMAT_WRITERS[id]!;
  const output = writer(input, format.file("ru-lite"));

  return output.content.toString();
};

describe("генераторы форматов", () => {
  it("каждый небинарный формат из реестра имеет генератор", () => {
    for (const format of FormatsContract) {
      if (format.shared || format.tool) continue;

      expect(FORMAT_WRITERS[format.id], format.id).toBeDefined();
    }
  });

  it("AmneziaVPN: массив подсетей с пустым ip", () => {
    const data = JSON.parse(render(FormatId.AMNEZIA)) as Array<{
      hostname: string;
      ip: string;
    }>;

    expect(data).toEqual([
      { hostname: "5.61.16.0/21", ip: "" },
      { hostname: "87.250.250.0/24", ip: "" },
    ]);
  });

  it("AmneziaVPN с доменами: только IPv4 в ips и первый адрес в ip", () => {
    const data = JSON.parse(render(FormatId.AMNEZIA_DOMAINS)) as Array<{
      hostname: string;
      ips?: string[];
      ip: string;
    }>;

    expect(data[2]).toEqual({
      hostname: "ozon.ru",
      ips: ["185.73.193.68"],
      ip: "185.73.193.68",
    });
    expect(data[3]).toEqual({ hostname: "sberbank.ru", ips: [], ip: "" });
  });

  it("WireGuard: прямой и инвертированный AllowedIPs", () => {
    const direct = render(FormatId.WIREGUARD);
    const inverted = render(FormatId.WIREGUARD_INVERTED);

    expect(direct).toContain(
      "AllowedIPs = 5.61.16.0/21, 87.250.250.0/24, 2a02:6b8::/32",
    );
    expect(inverted).not.toContain("5.61.16.0/21");
    expect(inverted).toContain("0.0.0.0/6");
    expect(inverted).toContain("128.0.0.0/1");
    expect(inverted).toContain("8000::/1");
  });

  it("sing-box: version 1 с ip_cidr и domain_suffix", () => {
    const data = JSON.parse(render(FormatId.SINGBOX_JSON)) as {
      version: number;
      rules: Array<Record<string, string[]>>;
    };

    expect(data.version).toBe(1);
    expect(data.rules[0]!.ip_cidr).toEqual([
      "5.61.16.0/21",
      "87.250.250.0/24",
      "2a02:6b8::/32",
    ]);
    expect(data.rules[1]!.domain_suffix).toEqual(["ozon.ru", "sberbank.ru"]);
  });

  it("Clash и Surge: правильные типы правил", () => {
    expect(render(FormatId.MIHOMO_YAML)).toContain("  - '2a02:6b8::/32'");
    expect(render(FormatId.CLASH_CLASSICAL)).toContain(
      "  - IP-CIDR6,2a02:6b8::/32,no-resolve",
    );
    expect(render(FormatId.SURGE)).toContain("IP-CIDR,5.61.16.0/21,no-resolve");
    expect(render(FormatId.SURGE)).toContain("DOMAIN-SUFFIX,ozon.ru");
    expect(render(FormatId.QUANTUMULTX)).toContain(
      "ip6-cidr, 2a02:6b8::/32, direct",
    );
    expect(render(FormatId.QUANTUMULTX)).toContain(
      "host-suffix, ozon.ru, direct",
    );
  });

  it("MikroTik: очистка списка и добавление подсетей", () => {
    const rsc = render(FormatId.MIKROTIK);

    expect(rsc).toContain('remove [find list="ru-lite"]');
    expect(rsc).toContain("add list=ru-lite address=5.61.16.0/21");
    expect(rsc).not.toContain("2a02:6b8::/32");
    expect(render(FormatId.MIKROTIK_IPV6)).toContain(
      "/ipv6 firewall address-list",
    );
  });

  it("Keenetic и Windows: маска из префикса", () => {
    expect(render(FormatId.KEENETIC_BAT)).toContain(
      "route ADD 5.61.16.0 MASK 255.255.248.0 0.0.0.0",
    );
    expect(render(FormatId.KEENETIC_CLI)).toContain(
      "ip route 5.61.16.0/21 ISP auto",
    );
    expect(render(FormatId.WINDOWS_BAT)).toContain(
      "route add 87.250.250.0 mask 255.255.255.0 %GW% metric 5",
    );
  });

  it("OpenWrt и dnsmasq: имя набора без дефисов", () => {
    expect(render(FormatId.OPENWRT_NFT)).toContain(
      "add element inet fw4 ru_lite { 5.61.16.0/21, 87.250.250.0/24 }",
    );
    expect(render(FormatId.OPENWRT_NFT)).toContain(
      "add element inet fw4 ru_lite6 { 2a02:6b8::/32 }",
    );
    expect(render(FormatId.DNSMASQ)).toContain(
      "nftset=/ozon.ru/4#inet#fw4#ru_lite",
    );
  });

  it("Linux и macOS: шлюз обязателен", () => {
    expect(render(FormatId.LINUX_SH)).toContain(
      "route add 5.61.16.0/21 via $GW",
    );
    expect(render(FormatId.MACOS_SH)).toContain(
      'route -n add -inet6 -net 2a02:6b8::/32 "$GW6"',
    );
  });

  it("v2rayN и Happ: домены с префиксом и без", () => {
    const v2rayn = JSON.parse(render(FormatId.V2RAYN)) as Array<{
      domain: string[];
      ip: string[];
    }>;
    const happ = JSON.parse(render(FormatId.HAPP)) as {
      DirectSites: string[];
      DirectIp: string[];
    };

    expect(v2rayn[0]!.domain).toEqual(["domain:ozon.ru", "domain:sberbank.ru"]);
    expect(v2rayn[0]!.ip).toHaveLength(3);
    expect(happ.DirectSites).toEqual(["ozon.ru", "sberbank.ru"]);
    expect(happ.DirectIp).toHaveLength(3);
  });

  it("текстовые списки без комментариев", () => {
    expect(render(FormatId.IPV4)).toBe("5.61.16.0/21\n87.250.250.0/24\n");
    expect(render(FormatId.IPV6)).toBe("2a02:6b8::/32\n");
    expect(render(FormatId.DOMAINS)).toBe("ozon.ru\nsberbank.ru\n");
  });
});
