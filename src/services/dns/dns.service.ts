import { pLimit } from "@/utils/limit";
import { ipFamily } from "@/helpers/cidr";
import { IpFamily } from "@/types/shared";
import { promises as dns } from "node:dns";
import appConfig from "@/constants/appConfig";
import { CacheService } from "@/services/cache";
import { TimeContract } from "@/contracts/time";
import { SourcesContract } from "@/contracts/sources";
import { IDohProvider, IResolvedDomain } from "@/types/network";

interface IDohAnswer {
  type?: number;
  data?: string;
}

interface IDohResponse {
  Answer?: IDohAnswer[];
}

// Типы DNS-записей
const RECORD_A = 1;
const RECORD_AAAA = 28;

/**
 * Резолвер доменов
 */
export class DnsService {
  constructor(private readonly cache: CacheService) {}

  /**
   * Запросить записи через один DoH-провайдер
   */
  private async resolveDoh(
    domain: string,
    type: "A" | "AAAA",
    provider: IDohProvider,
  ): Promise<string[]> {
    try {
      const url = new URL(provider.url);

      url.searchParams.set("name", domain);
      url.searchParams.set("type", type);

      const res = await fetch(url, {
        headers: provider.headers,
        signal: AbortSignal.timeout(appConfig.HTTP_TIMEOUT),
      });

      if (!res.ok) return [];

      const json = (await res.json()) as IDohResponse;
      const wanted = type === "A" ? RECORD_A : RECORD_AAAA;

      return (json.Answer ?? [])
        .filter(
          (answer) => answer.type === wanted && typeof answer.data === "string",
        )
        .map((answer) => answer.data!);
    } catch {
      return [];
    }
  }

  /**
   * Собрать A и AAAA записи домена из всех источников
   */
  private async resolveLive(domain: string): Promise<IResolvedDomain> {
    const tasks: Array<Promise<string[]>> = [
      dns.resolve4(domain).catch(() => []),
      dns.resolve6(domain).catch(() => []),
    ];

    for (const provider of SourcesContract.DOH) {
      tasks.push(this.resolveDoh(domain, "A", provider));
      tasks.push(this.resolveDoh(domain, "AAAA", provider));
    }

    const ipv4 = new Set<string>();
    const ipv6 = new Set<string>();

    for (const list of await Promise.all(tasks)) {
      for (const ip of list) {
        const family = ipFamily(ip);

        if (family === IpFamily.V4) ipv4.add(ip);
        if (family === IpFamily.V6) ipv6.add(ip.toLowerCase());
      }
    }

    return { domain, ipv4: [...ipv4].sort(), ipv6: [...ipv6].sort() };
  }

  /**
   * Зарезолвить домен с учётом кэша
   */
  async resolve(domain: string): Promise<IResolvedDomain> {
    const cached = this.cache.get<IResolvedDomain>(
      "dns",
      domain,
      TimeContract.DAY,
    );

    if (
      cached &&
      (appConfig.OFFLINE || cached.ipv4.length + cached.ipv6.length > 0)
    ) {
      if (appConfig.OFFLINE) return cached;
    }

    if (appConfig.OFFLINE) return cached ?? { domain, ipv4: [], ipv6: [] };

    const live = await this.resolveLive(domain);

    if (live.ipv4.length + live.ipv6.length > 0) {
      this.cache.set("dns", domain, live);

      return live;
    }

    // Пустой ответ при наличии недавнего кэша считаем сбоем сети
    const stale = this.cache.get<IResolvedDomain>(
      "dns",
      domain,
      TimeContract.WEEK,
    );

    return stale && stale.ipv4.length + stale.ipv6.length > 0 ? stale : live;
  }

  /**
   * Зарезолвить много доменов с ограничением параллельности
   */
  async resolveMany(domains: readonly string[]): Promise<IResolvedDomain[]> {
    return pLimit(
      domains.map((domain) => () => this.resolve(domain)),
      appConfig.DNS_CONCURRENCY,
    );
  }
}
