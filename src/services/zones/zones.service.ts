import { IZone } from "@/types/build";
import { fetchText } from "@/helpers/http";
import { parseLines } from "@/utils/files";
import { appLogger } from "@/config/logger";
import { RipeService } from "@/services/ripe";
import { CacheService } from "@/services/cache";
import { TimeContract } from "@/contracts/time";
import { formatNumber } from "@/utils/primitive";
import { aggregate, normalizeCidr } from "@/helpers/cidr";
import { IZoneSource, SourcesContract } from "@/contracts/sources";

/**
 * Российская зона для полного списка: RIPE как источник, ipdeny как фолбэк
 */
export class ZonesService {
  constructor(
    private readonly ripe: RipeService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Скачать текстовую зону и привести подсети к каноническому виду
   */
  private async fetchZone(source: IZoneSource): Promise<string[]> {
    const cached = this.cache.get<string[]>(
      "zones",
      source.name,
      TimeContract.DAY,
    );

    if (cached) return cached;

    const text = await fetchText(source.url);
    const cidrs = parseLines(text)
      .map(normalizeCidr)
      .filter((c): c is string => c !== null);

    if (cidrs.length === 0) {
      throw new Error(`Зона ${source.name} пуста`);
    }

    this.cache.set("zones", source.name, cidrs);

    return cidrs;
  }

  /**
   * Загрузить зону страны: сначала RIPE, при ошибке ipdeny
   */
  async loadCountryZone(): Promise<IZone> {
    const country = SourcesContract.COUNTRY;

    try {
      const resources = await this.ripe.getCountryResources(country);
      const zone: IZone = {
        name: `ripe-${country.toLowerCase()}`,
        ipv4: aggregate(resources.ipv4),
        ipv6: aggregate(resources.ipv6),
      };

      appLogger.ok(
        `RIPE ${country}: ${formatNumber(zone.ipv4.length)} IPv4 и ${formatNumber(zone.ipv6.length)} IPv6 подсетей`,
      );

      return zone;
    } catch (err) {
      appLogger.warn(`RIPE недоступен, беру ipdeny: ${(err as Error).message}`);
    }

    const zone: IZone = { name: "ipdeny", ipv4: [], ipv6: [] };

    for (const source of SourcesContract.FALLBACK_ZONES) {
      try {
        const cidrs = await this.fetchZone(source);

        if (source.family === 4) zone.ipv4 = aggregate(cidrs);
        else zone.ipv6 = aggregate(cidrs);

        appLogger.ok(`${source.name}: ${formatNumber(cidrs.length)} подсетей`);
      } catch (err) {
        if (source.required) throw err;

        appLogger.warn(`${source.name}: ${(err as Error).message}`);
      }
    }

    return zone;
  }
}
