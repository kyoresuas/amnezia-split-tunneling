import { IAppConfig } from "@/types/shared";
import { TimeContract } from "@/contracts/time";
import { toInt, toBool } from "@/utils/primitive";
import { PathsContract } from "@/contracts/paths";

/**
 * Главная конфигурация проекта
 */
const appConfig: IAppConfig = {
  DIST_DIR: process.env.DIST_DIR?.trim() || PathsContract.DIST_DIR,
  CACHE_DIR: process.env.CACHE_DIR?.trim() || PathsContract.CACHE_DIR,
  TOOLS_DIR: process.env.TOOLS_DIR?.trim() || PathsContract.TOOLS_DIR,
  DNS_CONCURRENCY: toInt(process.env.DNS_CONCURRENCY) ?? 20,
  HTTP_CONCURRENCY: toInt(process.env.HTTP_CONCURRENCY) ?? 6,
  HTTP_TIMEOUT: toInt(process.env.HTTP_TIMEOUT) ?? 15 * TimeContract.SECOND,
  CACHE_TTL: toInt(process.env.CACHE_TTL) ?? TimeContract.DAY,
  OFFLINE: toBool(process.env.OFFLINE) ?? false,
};

export default appConfig;
