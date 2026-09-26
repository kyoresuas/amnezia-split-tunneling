import { resolve } from "node:path";
import { Tier } from "@/types/shared";
import { fetchText } from "@/helpers/http";
import { DnsService } from "@/services/dns";
import { ICheckResult } from "@/types/check";
import { RipeService } from "@/services/ripe";
import appConfig from "@/constants/appConfig";
import { readText, parseLines } from "@/utils/files";
import { ipFamily, CidrIndex } from "@/helpers/cidr";
import { RepositoryContract } from "@/contracts/repository";
import { TIER_ORDER, TiersContract } from "@/contracts/tiers";

/**
 * Проверка адреса или домена на вхождение в уровни
 */
export class CheckService {
  private readonly indexes = new Map<Tier, CidrIndex>();

  constructor(
    private readonly dns: DnsService,
    private readonly ripe: RipeService,
    private readonly dir: string = appConfig.DIST_DIR,
  ) {}

  /**
   * Индекс подсетей уровня: локальный dist, иначе последний релиз
   */
  private async index(tier: Tier): Promise<CidrIndex> {
    const cached = this.indexes.get(tier);

    if (cached) return cached;

    const id = TiersContract[tier].id;
    const cidrs: string[] = [];

    for (const file of [`${id}.ipv4.txt`, `${id}.ipv6.txt`]) {
      const local = readText(resolve(this.dir, file));
      const text =
        local ??
        (await fetchText(RepositoryContract.rawUrl(file), { quiet: true }));

      cidrs.push(...parseLines(text));
    }

    const index = new CidrIndex(cidrs);

    this.indexes.set(tier, index);

    return index;
  }

  /**
   * Проверить один адрес
   */
  async checkIp(ip: string): Promise<ICheckResult> {
    const tiers = {} as Record<Tier, string | null>;

    for (const tier of TIER_ORDER) {
      tiers[tier] = (await this.index(tier)).find(ip);
    }

    let prefix: string | null = null;
    let asn: number | null = null;
    let holder: string | null = null;

    if (!appConfig.OFFLINE) {
      try {
        const info = await this.ripe.getNetworkInfo(ip);

        prefix = info.prefix;
        asn = info.asns[0] ?? null;

        if (asn) holder = (await this.ripe.getAsnOverview(asn)).holder;
      } catch {
        // RIPE недоступен, показываем только вхождение
      }
    }

    return { ip, tiers, prefix, asn, holder };
  }

  /**
   * Проверить адрес или домен: домен резолвится во все адреса
   */
  async check(target: string): Promise<ICheckResult[]> {
    if (ipFamily(target)) return [await this.checkIp(target)];

    const resolved = await this.dns.resolve(target);
    const ips = [...resolved.ipv4, ...resolved.ipv6];

    if (ips.length === 0) throw new Error(`${target} не резолвится`);

    const results: ICheckResult[] = [];

    for (const ip of ips) results.push(await this.checkIp(ip));

    return results;
  }
}
