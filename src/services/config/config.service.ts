import {
  IService,
  IGuardConfig,
  IExcludeEntry,
  IServiceCategory,
} from "@/types/config";
import { Tier } from "@/types/shared";
import { resolve, basename } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { PathsContract } from "@/contracts/paths";
import { readJson, readText } from "@/utils/files";
import { isValidCidr, normalizeCidr } from "@/helpers/cidr";

// Имя хоста
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

/**
 * Чтение и проверка конфигурации сервисов, guard и исключений
 */
export class ConfigService {
  constructor(
    private readonly servicesDir: string = PathsContract.SERVICES_DIR,
  ) {}

  /**
   * Прочитать все категории сервисов
   */
  loadCategories(): IServiceCategory[] {
    if (!existsSync(this.servicesDir)) {
      throw new Error(`Каталог сервисов не найден: ${this.servicesDir}`);
    }

    const files = readdirSync(this.servicesDir)
      .filter((file) => file.endsWith(".json"))
      .sort();
    const categories: IServiceCategory[] = [];

    for (const file of files) {
      const path = resolve(this.servicesDir, file);
      const raw = readJson<Omit<IServiceCategory, "id">>(path);

      if (!raw) throw new Error(`Не удалось прочитать JSON: ${path}`);

      categories.push({
        id: basename(file, ".json"),
        title: raw.title,
        description: raw.description,
        services: raw.services ?? [],
      });
    }

    return categories;
  }

  /**
   * Прочитать конфигурацию guard
   */
  loadGuard(): IGuardConfig {
    const guard = readJson<IGuardConfig>(PathsContract.GUARD_FILE);

    if (!guard)
      throw new Error(`Не удалось прочитать ${PathsContract.GUARD_FILE}`);

    return {
      sources: guard.sources ?? [],
      cidrs: guard.cidrs ?? [],
      forbiddenAsns: guard.forbiddenAsns ?? [],
    };
  }

  /**
   * Прочитать подсети, которые обязаны идти через VPN
   */
  loadExclude(): IExcludeEntry[] {
    const text = readText(PathsContract.EXCLUDE_FILE) ?? "";
    const entries: IExcludeEntry[] = [];

    for (const raw of text.split("\n")) {
      const [body = "", ...rest] = raw.split("#");
      const cidr = body.trim();

      if (!cidr) continue;

      const normalized = normalizeCidr(cidr);

      if (!normalized)
        throw new Error(`Невалидная подсеть в exclude.txt: ${cidr}`);

      entries.push({ cidr: normalized, comment: rest.join("#").trim() });
    }

    return entries;
  }

  /**
   * Проверить один сервис, вернуть список ошибок
   */
  private validateService(category: string, service: IService): string[] {
    const errors: string[] = [];
    const where = `${category}/${service.name || "?"}`;

    if (!service.name?.trim()) errors.push(`${category}: сервис без имени`);

    if (service.tier !== Tier.LITE && service.tier !== Tier.STANDARD) {
      errors.push(`${where}: tier должен быть lite или standard`);
    }

    if (!Array.isArray(service.domains)) {
      errors.push(`${where}: domains должен быть массивом`);
    } else {
      const seen = new Set<string>();

      for (const domain of service.domains) {
        if (!HOSTNAME_RE.test(domain))
          errors.push(`${where}: невалидный домен ${domain}`);
        if (domain !== domain.toLowerCase())
          errors.push(`${where}: домен не в нижнем регистре ${domain}`);
        if (seen.has(domain)) errors.push(`${where}: дубль домена ${domain}`);

        seen.add(domain);
      }
    }

    for (const entry of service.asns ?? []) {
      if (!Number.isInteger(entry.asn) || entry.asn <= 0) {
        errors.push(`${where}: невалидный ASN ${String(entry.asn)}`);
      }

      if (!entry.holder?.trim())
        errors.push(`${where}: AS${entry.asn} без holder`);
      if (!entry.name?.trim()) errors.push(`${where}: AS${entry.asn} без name`);
    }

    for (const entry of service.cidrs ?? []) {
      if (!isValidCidr(entry.cidr))
        errors.push(`${where}: невалидная подсеть ${entry.cidr}`);
      if (!entry.reason?.trim())
        errors.push(`${where}: подсеть ${entry.cidr} без reason`);
    }

    for (const app of service.apps ?? []) {
      if (!app.package?.trim()) errors.push(`${where}: приложение без package`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(app.auditedAt ?? "")) {
        errors.push(
          `${where}: ${app.package} auditedAt не в формате YYYY-MM-DD`,
        );
      }
    }

    if (
      (service.domains?.length ?? 0) === 0 &&
      (service.asns?.length ?? 0) === 0 &&
      (service.cidrs?.length ?? 0) === 0
    ) {
      errors.push(`${where}: нет ни доменов, ни ASN, ни подсетей`);
    }

    return errors;
  }

  /**
   * Проверить все категории, вернуть список ошибок
   */
  validate(categories: IServiceCategory[]): string[] {
    const errors: string[] = [];
    const names = new Set<string>();
    const asns = new Map<number, string>();

    for (const category of categories) {
      if (!category.title?.trim()) errors.push(`${category.id}: нет title`);
      if (!category.description?.trim())
        errors.push(`${category.id}: нет description`);

      for (const service of category.services) {
        const key = service.name?.trim().toLowerCase();

        if (key && names.has(key))
          errors.push(`Сервис ${service.name} встречается дважды`);
        if (key) names.add(key);

        for (const entry of service.asns ?? []) {
          const owner = asns.get(entry.asn);

          if (owner && owner !== service.name) {
            errors.push(
              `AS${entry.asn} указан и у ${owner}, и у ${service.name}`,
            );
          }

          asns.set(entry.asn, service.name);
        }

        errors.push(...this.validateService(category.id, service));
      }
    }

    return errors;
  }
}
