import {
  isBogon,
  subtract,
  aggregate,
  CidrIndex,
  parseCidr,
  bigIntToIp,
  splitByFamily,
  countIntersecting,
} from "@/helpers/cidr";
import { pLimit } from "@/utils/limit";
import { DnsService } from "@/services/dns";
import { appLogger } from "@/config/logger";
import appConfig from "@/constants/appConfig";
import { RipeService } from "@/services/ripe";
import { GuardService } from "@/services/guard";
import { ZonesService } from "@/services/zones";
import { Tier, IpFamily } from "@/types/shared";
import { formatNumber } from "@/utils/primitive";
import { TiersContract } from "@/contracts/tiers";
import { SourcesContract } from "@/contracts/sources";
import { IService, IExcludeEntry, IServiceCategory } from "@/types/config";
import { IZone, ITierData, IBuildResult, IServiceRoutes } from "@/types/build";

/**
 * Сборка уровней: сервисы, зона страны, guard, исключения, лимиты
 */
export class BuildService {
  constructor(
    private readonly dns: DnsService,
    private readonly ripe: RipeService,
    private readonly guard: GuardService,
    private readonly zones: ZonesService,
    private readonly exclude: IExcludeEntry[],
    private readonly categories: IServiceCategory[],
  ) {}

  /**
   * Подсеть целиком внутри зоны страны
   */
  private insideZone(index: CidrIndex, cidr: string): boolean {
    const parsed = parseCidr(cidr);

    if (!parsed) return false;

    const start = index.find(bigIntToIp(parsed.start, parsed.family));
    const end = index.find(bigIntToIp(parsed.end, parsed.family));

    return start !== null && start === end;
  }

  /**
   * Подсеть российская: внутри зоны страны или страна RU в whois
   */
  private async isRussian(
    zoneIndex: CidrIndex,
    cidr: string,
  ): Promise<boolean> {
    if (this.insideZone(zoneIndex, cidr)) return true;

    const countries = await this.ripe.getPrefixCountries(cidr);

    return countries.includes(SourcesContract.COUNTRY);
  }

  /**
   * Префиксы собственных ASN сервиса, отфильтрованные по стране
   */
  private async loadAsnPrefixes(
    service: IService,
    zoneIndex: CidrIndex,
  ): Promise<string[]> {
    const kept: string[] = [];
    const dropped: string[] = [];

    for (const entry of service.asns ?? []) {
      const announced = await this.ripe.getAnnouncedPrefixes(entry.asn);

      for (const cidr of [...announced.ipv4, ...announced.ipv6]) {
        if (await this.isRussian(zoneIndex, cidr)) kept.push(cidr);
        else dropped.push(cidr);
      }
    }

    if (dropped.length > 0) {
      appLogger.verbose(
        `${service.name}: вне страны ${dropped.length} префиксов ASN: ${dropped.slice(0, 5).join(", ")}${dropped.length > 5 ? "…" : ""}`,
      );
    }

    return kept;
  }

  /**
   * Собрать подсети одного сервиса
   */
  private async resolveService(
    category: IServiceCategory,
    service: IService,
    zoneIndex: CidrIndex,
  ): Promise<IServiceRoutes> {
    const asnPrefixes = await this.loadAsnPrefixes(service, zoneIndex);
    const ownIndex = new CidrIndex(asnPrefixes);
    const resolved = await this.dns.resolveMany(service.domains);
    const cidrs = new Set<string>(asnPrefixes);
    const domainIps = new Map<string, string[]>();
    const foreign: string[] = [];
    let exact = 0;
    let silent = 0;

    for (const item of resolved) {
      const ips = [...item.ipv4, ...item.ipv6];

      if (ips.length === 0) {
        silent++;
        continue;
      }

      domainIps.set(item.domain, ips);

      for (const ip of ips) {
        if (ownIndex.has(ip)) continue;

        const parsed = parseCidr(ip)!;
        const exactCidr = `${ip}/${parsed.family === IpFamily.V4 ? 32 : 128}`;

        if (!(await this.isRussian(zoneIndex, exactCidr))) {
          foreign.push(`${item.domain} ${ip}`);
          continue;
        }

        cidrs.add(exactCidr);
        exact++;
      }
    }

    if (foreign.length > 0) {
      appLogger.verbose(
        `${service.name}: за рубежом ${foreign.length} адресов: ${foreign.slice(0, 5).join(", ")}${foreign.length > 5 ? "…" : ""}`,
      );
    }

    for (const entry of service.cidrs ?? []) cidrs.add(entry.cidr);

    if (silent > 0) {
      const names = resolved
        .filter((r) => r.ipv4.length + r.ipv6.length === 0)
        .map((r) => r.domain);

      appLogger.warn(
        `${service.name}: не резолвятся ${silent}: ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}`,
      );
    }

    const { ipv4, ipv6 } = splitByFamily([...cidrs]);

    appLogger.info(
      `${service.name}: ${service.domains.length} доменов, ${asnPrefixes.length} префиксов ASN, ${exact} точных адресов, итого ${ipv4.length} IPv4 и ${ipv6.length} IPv6`,
    );

    return {
      name: service.name,
      category: category.id,
      tier: service.tier,
      ipv4,
      ipv6,
      domains: [...service.domains].sort(),
      domainIps,
    };
  }

  /**
   * Очистить, агрегировать и проверить лимит уровня
   */
  private finalizeTier(
    tier: Tier,
    ipv4: string[],
    ipv6: string[],
    removals: string[],
  ): {
    ipv4: string[];
    ipv6: string[];
    subtracted4: number;
    subtracted6: number;
  } {
    const clean4 = aggregate(ipv4.filter((cidr) => !isBogon(cidr)));
    const clean6 = aggregate(ipv6.filter((cidr) => !isBogon(cidr)));
    const result4 = subtract(clean4, removals);
    const result6 = subtract(clean6, removals);
    const limit = TiersContract[tier].limit;

    if (limit !== null && result4.length > limit) {
      throw new Error(
        `${TiersContract[tier].id}: ${result4.length} подсетей IPv4 при лимите ${limit}`,
      );
    }

    return {
      ipv4: result4,
      ipv6: result6,
      subtracted4: countIntersecting(clean4, removals),
      subtracted6: countIntersecting(clean6, removals),
    };
  }

  /**
   * Собрать все уровни
   */
  async build(): Promise<IBuildResult> {
    appLogger.step("Зона страны");

    const zone: IZone = await this.zones.loadCountryZone();
    const zoneIndex = new CidrIndex([...zone.ipv4, ...zone.ipv6]);

    appLogger.step("Guard");

    const guardCidrs = await this.guard.loadCidrs();
    const removals = [...guardCidrs, ...this.exclude.map((e) => e.cidr)];

    appLogger.info(
      `Guard: ${formatNumber(guardCidrs.length)} подсетей, исключений: ${this.exclude.length}`,
    );

    appLogger.step("Сервисы");

    const tasks: Array<() => Promise<IServiceRoutes>> = [];

    for (const category of this.categories) {
      for (const service of category.services) {
        tasks.push(() => this.resolveService(category, service, zoneIndex));
      }
    }

    const routes = await pLimit(tasks, appConfig.HTTP_CONCURRENCY);
    const tiers = {} as Record<Tier, ITierData>;
    let subtracted4 = 0;
    let subtracted6 = 0;

    for (const tier of [Tier.LITE, Tier.STANDARD, Tier.FULL]) {
      const selected = routes.filter(
        (r) => tier !== Tier.LITE || r.tier === Tier.LITE,
      );
      const ipv4 = selected.flatMap((r) => r.ipv4);
      const ipv6 = selected.flatMap((r) => r.ipv6);

      if (tier === Tier.FULL) {
        ipv4.push(...zone.ipv4);
        ipv6.push(...zone.ipv6);
      }

      const finalized = this.finalizeTier(tier, ipv4, ipv6, removals);
      const domains = [...new Set(selected.flatMap((r) => r.domains))].sort();
      const domainIps = new Map<string, string[]>();

      for (const route of selected) {
        for (const [domain, ips] of route.domainIps) domainIps.set(domain, ips);
      }

      tiers[tier] = {
        tier,
        id: TiersContract[tier].id,
        ipv4: finalized.ipv4,
        ipv6: finalized.ipv6,
        domains,
        domainIps,
        services: selected.length,
        categories: new Set(selected.map((r) => r.category)).size,
      };
      subtracted4 += finalized.subtracted4;
      subtracted6 += finalized.subtracted6;

      appLogger.ok(
        `${TiersContract[tier].id}: ${formatNumber(finalized.ipv4.length)} IPv4, ${formatNumber(finalized.ipv6.length)} IPv6, ${domains.length} доменов, ${selected.length} сервисов`,
      );
    }

    return { tiers, guard: { subtracted4, subtracted6 } };
  }
}
