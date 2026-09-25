import { Tier } from "@/types/shared";
import { DnsService } from "@/services/dns";
import { it, expect, describe } from "vitest";
import { RipeService } from "@/services/ripe";
import { BuildService } from "@/services/build";
import { GuardService } from "@/services/guard";
import { ZonesService } from "@/services/zones";
import { IServiceCategory } from "@/types/config";

/**
 * Заглушки сервисов: сеть не трогаем
 */
const dns = {
  resolveMany: async (domains: readonly string[]) =>
    domains.map((domain) => ({
      domain,
      ipv4:
        domain === "foreign.example"
          ? ["8.8.8.8"]
          : domain === "dead.example"
            ? []
            : ["185.73.193.68"],
      ipv6: [],
    })),
} as unknown as DnsService;

const ripe = {
  getAnnouncedPrefixes: async (asn: number) => ({
    asn,
    ipv4: ["185.73.192.0/22", "100.43.64.0/19"],
    ipv6: ["2a02:6b8::/32"],
  }),
  getPrefixCountries: async (prefix: string) =>
    prefix.startsWith("100.")
      ? ["US"]
      : prefix.startsWith("8.")
        ? ["US"]
        : ["RU"],
} as unknown as RipeService;

const guard = {
  loadCidrs: async () => ["8.8.8.0/24"],
} as unknown as GuardService;

const zones = {
  loadCountryZone: async () => ({
    name: "test",
    ipv4: ["185.73.192.0/22", "5.61.16.0/21", "192.168.0.0/16"],
    ipv6: ["2a02:6b8::/32"],
  }),
} as unknown as ZonesService;

const categories: IServiceCategory[] = [
  {
    id: "marketplaces",
    title: "Маркетплейсы",
    description: "тест",
    services: [
      {
        name: "Ozon",
        tier: Tier.STANDARD,
        domains: ["ozon.ru", "foreign.example", "dead.example"],
        asns: [{ asn: 44386, name: "Ozon", holder: "OZON" }],
        cidrs: [{ cidr: "10.0.0.0/8", reason: "bogon для проверки очистки" }],
      },
    ],
  },
  {
    id: "banks",
    title: "Банки",
    description: "тест",
    services: [{ name: "Банк", tier: Tier.LITE, domains: ["bank.example"] }],
  },
];

describe("BuildService", () => {
  it("собирает уровни: префиксы ASN только российские, /32 для чужих сетей, guard и bogon вычитаются", async () => {
    const build = new BuildService({
      dns,
      ripe,
      guard,
      zones,
      exclude: [{ cidr: "5.61.16.0/24", comment: "" }],
      categories,
    });
    const result = await build.build();

    const lite = result.tiers[Tier.LITE];
    const standard = result.tiers[Tier.STANDARD];
    const full = result.tiers[Tier.FULL];

    // Lite: только банк, его адрес не входит в чужие сети, поэтому точный /32
    expect(lite.ipv4).toEqual(["185.73.193.68/32"]);
    expect(lite.services).toBe(1);
    expect(lite.domains).toEqual(["bank.example"]);

    // Standard: префикс Ozon покрывает адрес банка, зарубежный префикс ASN отброшен, 8.8.8.8 отброшен, bogon вычищен
    expect(standard.ipv4).toEqual(["185.73.192.0/22"]);
    expect(standard.ipv6).toEqual(["2a02:6b8::/32"]);
    expect(standard.services).toBe(2);
    expect(standard.categories).toBe(2);

    // Full: зона страны без bogon и без исключённой подсети
    expect(full.ipv4).toContain("5.61.17.0/24");
    expect(full.ipv4).not.toContain("5.61.16.0/21");
    expect(full.ipv4).not.toContain("192.168.0.0/16");
    expect(full.ipv4).toContain("185.73.192.0/22");
    expect(result.guard.subtracted4).toBeGreaterThan(0);
  });

  it("падает при превышении лимита уровня", async () => {
    const many: IServiceCategory[] = [
      {
        id: "x",
        title: "x",
        description: "x",
        services: [
          {
            name: "Много",
            tier: Tier.LITE,
            domains: [],
            cidrs: Array.from({ length: 501 }, (_, i) => ({
              cidr: `5.${i >> 8}.${i & 255}.0/25`,
              reason: "тест",
            })),
          },
        ],
      },
    ];
    const build = new BuildService({
      dns,
      ripe,
      guard,
      zones,
      exclude: [],
      categories: many,
    });

    await expect(build.build()).rejects.toThrow(/лимите 500/);
  });
});
