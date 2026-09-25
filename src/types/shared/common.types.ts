/**
 * Уровень списка
 */
export enum Tier {
  LITE = "lite",
  STANDARD = "standard",
  FULL = "full",
}

/**
 * Идентификатор уровня в именах файлов
 */
export type TierId = "ru-lite" | "ru-standard" | "ru-full";

/**
 * Семейство IP-адресов
 */
export enum IpFamily {
  V4 = 4,
  V6 = 6,
}

export interface IAppConfig {
  // Каталог с результатами сборки
  DIST_DIR: string;
  // Каталог кэша сетевых ответов
  CACHE_DIR: string;
  // Каталог с бинарниками sing-box и mihomo
  TOOLS_DIR: string;
  // Параллельность DNS-запросов
  DNS_CONCURRENCY: number;
  // Параллельность HTTP-запросов к RIPE
  HTTP_CONCURRENCY: number;
  // Таймаут HTTP-запроса в миллисекундах
  HTTP_TIMEOUT: number;
  // Время жизни кэша в миллисекундах
  CACHE_TTL: number;
  // Не ходить в сеть, использовать только кэш
  OFFLINE: boolean;
}
