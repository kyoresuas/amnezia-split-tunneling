import chalk from "chalk";
import { Tier } from "@/types/shared";
import { DnsService } from "@/services/dns";
import { ICheckResult } from "@/types/check";
import { RipeService } from "@/services/ripe";
import { CacheService } from "@/services/cache";
import { CheckService } from "@/services/check";
import { TIER_ORDER, TiersContract } from "@/contracts/tiers";

/**
 * Напечатать результат проверки одного адреса
 */
const print = (result: ICheckResult): void => {
  const lines: string[] = [chalk.bold(result.ip)];

  for (const tier of TIER_ORDER) {
    const match = result.tiers[tier as Tier];
    const label = TiersContract[tier].id.padEnd(12);

    lines.push(
      match
        ? `  ${chalk.green("да ")} ${label} ${chalk.gray(match)}`
        : `  ${chalk.red("нет")} ${label}`,
    );
  }

  if (result.prefix) {
    lines.push(
      `  ${chalk.gray("RIPE")} ${result.prefix}${result.asn ? ` AS${result.asn}` : ""}${result.holder ? ` ${result.holder}` : ""}`,
    );
  }

  process.stdout.write(lines.join("\n") + "\n\n");
};

/**
 * Проверить адрес или домен и вернуть, входит ли он хотя бы в один уровень
 */
export const runCheck = async (target: string): Promise<boolean> => {
  const cache = new CacheService();
  const check = new CheckService(new DnsService(cache), new RipeService(cache));
  const results = await check.check(target);

  for (const result of results) print(result);

  return results.some((r) => Object.values(r.tiers).some((m) => m !== null));
};
