import { appLogger } from "@/config/logger";
import appConfig from "@/constants/appConfig";
import { RipeService } from "@/services/ripe";
import { CacheService } from "@/services/cache";
import { GuardService } from "@/services/guard";
import { ConfigService } from "@/services/config";

/**
 * Проверить конфигурацию без сборки
 */
export const runVerify = async (offline: boolean): Promise<string[]> => {
  if (offline) appConfig.OFFLINE = true;

  const config = new ConfigService();
  const categories = config.loadCategories();
  const errors = config.validate(categories);
  const services = categories.reduce((sum, c) => sum + c.services.length, 0);
  const domains = categories.reduce(
    (sum, c) => sum + c.services.reduce((s, x) => s + x.domains.length, 0),
    0,
  );

  appLogger.info(
    `Категорий: ${categories.length}, сервисов: ${services}, доменов: ${domains}`,
  );

  config.loadGuard();
  config.loadExclude();

  if (errors.length === 0 && !appConfig.OFFLINE) {
    const cache = new CacheService();
    const guard = new GuardService(
      config.loadGuard(),
      new RipeService(cache),
      cache,
    );

    errors.push(...(await guard.verifyAsns(categories)));
  }

  if (errors.length === 0) appLogger.ok("Конфигурация в порядке");
  else for (const error of errors) appLogger.error(error);

  return errors;
};
