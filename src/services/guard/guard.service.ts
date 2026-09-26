import { pLimit } from "@/utils/limit";
import { parseLines } from "@/utils/files";
import { appLogger } from "@/config/logger";
import appConfig from "@/constants/appConfig";
import { RipeService } from "@/services/ripe";
import { CacheService } from "@/services/cache";
import { TimeContract } from "@/contracts/time";
import { fetchJson, fetchText } from "@/helpers/http";
import { aggregate, normalizeCidr } from "@/helpers/cidr";
import { IGuardConfig, IGuardSource, IServiceCategory } from "@/types/config";
import { IAwsResponse, IFastlyResponse, IGoogleResponse } from "@/types/guard";

/**
 * Guard: чужие CDN, anycast и хостинги, которым не место в списках
 */
export class GuardService {
  constructor(
    private readonly guard: IGuardConfig,
    private readonly ripe: RipeService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Скачать и разобрать один внешний список
   */
  private async fetchSource(source: IGuardSource): Promise<string[]> {
    switch (source.format) {
      case "text":
      case "cloudflare":
        return parseLines(await fetchText(source.url));

      case "fastly": {
        const json = await fetchJson<IFastlyResponse>(source.url);

        return [...(json.addresses ?? []), ...(json.ipv6_addresses ?? [])];
      }

      case "aws": {
        const json = await fetchJson<IAwsResponse>(source.url);
        const wanted = source.awsServices ? new Set(source.awsServices) : null;
        const out: string[] = [];

        for (const item of json.prefixes ?? []) {
          if (item.ip_prefix && (!wanted || wanted.has(item.service ?? ""))) {
            out.push(item.ip_prefix);
          }
        }

        for (const item of json.ipv6_prefixes ?? []) {
          if (item.ipv6_prefix && (!wanted || wanted.has(item.service ?? ""))) {
            out.push(item.ipv6_prefix);
          }
        }

        return out;
      }

      case "google": {
        const json = await fetchJson<IGoogleResponse>(source.url);

        return (json.prefixes ?? [])
          .map((item) => item.ipv4Prefix ?? item.ipv6Prefix ?? "")
          .filter(Boolean);
      }
    }
  }

  /**
   * Загрузить один источник с кэшем. При ошибке сети берётся устаревший кэш
   */
  private async loadSource(source: IGuardSource): Promise<string[]> {
    const fresh = this.cache.get<string[]>(
      "guard",
      source.name,
      TimeContract.DAY,
    );

    if (fresh) return fresh;

    try {
      const cidrs = (await this.fetchSource(source))
        .map(normalizeCidr)
        .filter((c): c is string => c !== null);

      if (cidrs.length === 0) throw new Error("пустой ответ");

      this.cache.set("guard", source.name, cidrs);
      appLogger.verbose(`Guard ${source.name}: ${cidrs.length} подсетей`);

      return cidrs;
    } catch (err) {
      const stale = this.cache.get<string[]>(
        "guard",
        source.name,
        Number.MAX_SAFE_INTEGER,
      );

      if (stale) {
        appLogger.warn(
          `Guard ${source.name}: сеть недоступна, беру кэш (${(err as Error).message})`,
        );

        return stale;
      }

      appLogger.warn(
        `Guard ${source.name}: пропущен (${(err as Error).message})`,
      );

      return [];
    }
  }

  /**
   * Собрать все подсети guard: внешние источники плюс статический список
   */
  async loadCidrs(): Promise<string[]> {
    const lists = await pLimit(
      this.guard.sources.map((source) => () => this.loadSource(source)),
      appConfig.HTTP_CONCURRENCY,
    );
    const all = [...lists.flat(), ...this.guard.cidrs];

    return aggregate(all);
  }

  /**
   * Проверить ASN всех сервисов: запрещённые списки и соответствие holder по RIPE
   */
  async verifyAsns(categories: IServiceCategory[]): Promise<string[]> {
    const forbidden = new Map(
      this.guard.forbiddenAsns.map((a) => [a.asn, a.name]),
    );
    const checks: Array<() => Promise<string | null>> = [];

    for (const category of categories) {
      for (const service of category.services) {
        for (const entry of service.asns ?? []) {
          checks.push(async () => {
            const banned = forbidden.get(entry.asn);

            if (banned) {
              return `${service.name}: AS${entry.asn} это ${banned}, хостинг или CDN, а не сервис`;
            }

            const overview = await this.ripe.getAsnOverview(entry.asn);
            const holder = overview.holder.toLowerCase();

            if (!holder.includes(entry.holder.toLowerCase())) {
              return `${service.name}: AS${entry.asn} принадлежит «${overview.holder}», ожидалось «${entry.holder}»`;
            }

            if (!overview.announced) {
              return `${service.name}: AS${entry.asn} не анонсируется`;
            }

            return null;
          });
        }
      }
    }

    const results = await pLimit(checks, appConfig.HTTP_CONCURRENCY);

    return results.filter((r): r is string => r !== null);
  }
}
