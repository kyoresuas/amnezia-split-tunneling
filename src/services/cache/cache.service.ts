import { resolve } from "node:path";
import appConfig from "@/constants/appConfig";
import { fileAge, readJson, writeJson } from "@/utils/files";

/**
 * Файловый кэш сетевых ответов. Ключ превращается в имя файла внутри пространства
 */
export class CacheService {
  constructor(private readonly dir: string = appConfig.CACHE_DIR) {}

  /**
   * Путь к файлу кэша
   */
  private pathFor(namespace: string, key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9._:-]/g, "_");

    return resolve(this.dir, namespace, `${safe}.json`);
  }

  /**
   * Получить значение, если оно не старше ttl. В режиме OFFLINE ttl не учитывается
   */
  get<T>(namespace: string, key: string, ttl: number): T | null {
    const path = this.pathFor(namespace, key);
    const age = fileAge(path);

    if (age === null) return null;
    if (!appConfig.OFFLINE && age > ttl) return null;

    return readJson<T>(path);
  }

  /**
   * Сохранить значение
   */
  set(namespace: string, key: string, value: unknown): void {
    writeJson(this.pathFor(namespace, key), value);
  }
}
