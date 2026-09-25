import {
  IAsnOverview,
  INetworkInfo,
  IAnnouncedPrefixes,
} from "@/types/network";
import { fetchJson } from "@/helpers/http";
import { normalizeCidr } from "@/helpers/cidr";
import { CacheService } from "@/services/cache";
import { TimeContract } from "@/contracts/time";
import { SourcesContract } from "@/contracts/sources";

interface IRipeResponse<T> {
  data?: T;
  status?: string;
}

interface IRipeAsOverview {
  holder?: string;
  announced?: boolean;
}

interface IRipeAnnouncedPrefixes {
  prefixes?: Array<{ prefix?: string }>;
}

interface IRipeNetworkInfo {
  prefix?: string;
  asns?: Array<number | string>;
}

interface IRipeCountryResources {
  resources?: { ipv4?: string[]; ipv6?: string[]; asn?: string[] };
}

interface IRipeWhois {
  records?: Array<Array<{ key?: string; value?: string }>>;
}

export interface ICountryResources {
  ipv4: string[];
  ipv6: string[];
}

/**
 * Клиент RIPE Stat с файловым кэшем
 */
export class RipeService {
  constructor(private readonly cache: CacheService) {}

  /**
   * Запросить RIPE Stat и вернуть поле data
   */
  private async request<T>(
    url: string,
    params: Record<string, string>,
  ): Promise<T> {
    const query = new URL(url);

    for (const [key, value] of Object.entries(params)) {
      query.searchParams.set(key, value);
    }

    const json = await fetchJson<IRipeResponse<T>>(query.toString());

    if (!json.data) throw new Error(`RIPE Stat вернул пустой ответ: ${url}`);

    return json.data;
  }

  /**
   * Сведения об автономной системе
   */
  async getAsnOverview(asn: number): Promise<IAsnOverview> {
    const cached = this.cache.get<IAsnOverview>(
      "asn-overview",
      String(asn),
      TimeContract.WEEK,
    );

    if (cached) return cached;

    const data = await this.request<IRipeAsOverview>(
      SourcesContract.RIPE.AS_OVERVIEW,
      {
        resource: `AS${asn}`,
      },
    );
    const overview: IAsnOverview = {
      asn,
      holder: data.holder ?? "",
      announced: data.announced ?? false,
    };

    this.cache.set("asn-overview", String(asn), overview);

    return overview;
  }

  /**
   * Анонсируемые префиксы автономной системы
   */
  async getAnnouncedPrefixes(asn: number): Promise<IAnnouncedPrefixes> {
    const cached = this.cache.get<IAnnouncedPrefixes>(
      "asn-prefixes",
      String(asn),
      TimeContract.DAY,
    );

    if (cached) return cached;

    const data = await this.request<IRipeAnnouncedPrefixes>(
      SourcesContract.RIPE.ANNOUNCED_PREFIXES,
      { resource: `AS${asn}` },
    );
    const result: IAnnouncedPrefixes = { asn, ipv4: [], ipv6: [] };

    for (const item of data.prefixes ?? []) {
      const cidr = item.prefix ? normalizeCidr(item.prefix) : null;

      if (!cidr) continue;

      (cidr.includes(":") ? result.ipv6 : result.ipv4).push(cidr);
    }

    this.cache.set("asn-prefixes", String(asn), result);

    return result;
  }

  /**
   * Префикс и origin ASN адреса
   */
  async getNetworkInfo(ip: string): Promise<INetworkInfo> {
    const cached = this.cache.get<INetworkInfo>(
      "network-info",
      ip,
      TimeContract.WEEK,
    );

    if (cached) return cached;

    const data = await this.request<IRipeNetworkInfo>(
      SourcesContract.RIPE.NETWORK_INFO,
      {
        resource: ip,
      },
    );
    const info: INetworkInfo = {
      prefix: data.prefix ? normalizeCidr(data.prefix) : null,
      asns: (data.asns ?? [])
        .map(Number)
        .filter((asn) => Number.isInteger(asn) && asn > 0),
    };

    this.cache.set("network-info", ip, info);

    return info;
  }

  /**
   * Все подсети, зарегистрированные за страной по данным RIR
   */
  async getCountryResources(country: string): Promise<ICountryResources> {
    const cached = this.cache.get<ICountryResources>(
      "country",
      country,
      TimeContract.DAY,
    );

    if (cached) return cached;

    const data = await this.request<IRipeCountryResources>(
      SourcesContract.RIPE.COUNTRY_RESOURCES,
      { resource: country, v4_format: "prefix" },
    );
    const normalize = (items: string[] = []): string[] =>
      items.map(normalizeCidr).filter((c): c is string => c !== null);
    const resources: ICountryResources = {
      ipv4: normalize(data.resources?.ipv4),
      ipv6: normalize(data.resources?.ipv6),
    };

    if (resources.ipv4.length === 0) {
      throw new Error(`RIPE Stat вернул пустой список подсетей для ${country}`);
    }

    this.cache.set("country", country, resources);

    return resources;
  }

  /**
   * Страны из inetnum-объектов whois для подсети
   */
  async getPrefixCountries(prefix: string): Promise<string[]> {
    const cached = this.cache.get<string[]>(
      "whois-country",
      prefix,
      30 * TimeContract.DAY,
    );

    if (cached) return cached;

    const data = await this.request<IRipeWhois>(SourcesContract.RIPE.WHOIS, {
      resource: prefix,
    });
    const countries = new Set<string>();

    for (const record of data.records ?? []) {
      for (const field of record) {
        if (field.key?.toLowerCase() === "country" && field.value) {
          countries.add(field.value.trim().toUpperCase());
        }
      }
    }

    const result = [...countries];

    this.cache.set("whois-country", prefix, result);

    return result;
  }
}
