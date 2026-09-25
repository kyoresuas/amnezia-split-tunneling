import { appLogger } from "@/config/logger";
import { DnsService } from "@/services/dns";
import { IManifest } from "@/types/manifest";
import appConfig from "@/constants/appConfig";
import { RipeService } from "@/services/ripe";
import { CacheService } from "@/services/cache";
import { GuardService } from "@/services/guard";
import { ZonesService } from "@/services/zones";
import { BuildService } from "@/services/build";
import { ToolsService } from "@/services/tools";
import { ConfigService } from "@/services/config";
import { FormatsService } from "@/services/formats";
import { ManifestService } from "@/services/manifest";

export interface IUpdateOptions {
  // Не ходить в сеть, собирать из кэша
  offline: boolean;
  // Не проверять ASN через RIPE
  skipAsnCheck: boolean;
}

/**
 * Полный пайплайн
 */
export const runUpdate = async (
  options: IUpdateOptions,
): Promise<IManifest> => {
  if (options.offline) appConfig.OFFLINE = true;

  const startedAt = Date.now();
  const generatedAt = new Date().toISOString();
  const config = new ConfigService();
  const cache = new CacheService();
  const ripe = new RipeService(cache);
  const dns = new DnsService(cache);
  const tools = new ToolsService();

  appLogger.step("Конфигурация");

  const categories = config.loadCategories();
  const errors = config.validate(categories);

  if (errors.length > 0) {
    throw new Error(`Ошибки конфигурации:\n- ${errors.join("\n- ")}`);
  }

  const services = categories.reduce((sum, c) => sum + c.services.length, 0);

  appLogger.info(`Категорий: ${categories.length}, сервисов: ${services}`);

  const guard = new GuardService(config.loadGuard(), ripe, cache);

  if (!appConfig.OFFLINE && !options.skipAsnCheck) {
    const asnErrors = await guard.verifyAsns(categories);

    if (asnErrors.length > 0) {
      throw new Error(`Ошибки ASN:\n- ${asnErrors.join("\n- ")}`);
    }

    appLogger.ok("ASN всех сервисов подтверждены через RIPE");
  }

  const zones = new ZonesService(ripe, cache);
  const build = new BuildService(
    categories,
    config.loadExclude(),
    dns,
    ripe,
    guard,
    zones,
  );
  const result = await build.build();

  appLogger.step("Форматы");

  const files = new FormatsService(tools).write(result, generatedAt);

  appLogger.step("Манифест");

  const manifest = await new ManifestService().create(
    result,
    files,
    categories,
    generatedAt,
  );

  appLogger.ok(`Готово за ${((Date.now() - startedAt) / 1000).toFixed(0)} с`);

  return manifest;
};
