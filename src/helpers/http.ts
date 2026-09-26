import { sleep } from "@/utils/limit";
import { appLogger } from "@/config/logger";
import { IFetchOptions } from "@/types/http";
import appConfig from "@/constants/appConfig";
import { HttpContract } from "@/contracts/http";

/**
 * Выполнить HTTP-запрос с таймаутом и повторами, вернуть Response
 */
export const fetchWithRetry = async (
  url: string,
  options: IFetchOptions = {},
): Promise<Response> => {
  if (appConfig.OFFLINE) {
    throw new Error(`Режим OFFLINE, запрос запрещён: ${url}`);
  }

  const retries = options.retries ?? HttpContract.RETRIES;
  const timeout = options.timeout ?? appConfig.HTTP_TIMEOUT;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": HttpContract.USER_AGENT, ...options.headers },
        signal: AbortSignal.timeout(timeout),
      });

      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }

      return res;
    } catch (err) {
      lastError = err;

      if (attempt < retries) {
        if (!options.quiet) {
          appLogger.verbose(`Повтор ${attempt}/${retries}: ${url}`);
        }

        await sleep(HttpContract.RETRY_DELAY * attempt);
      }
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);

  throw new Error(
    `Запрос не удался после ${retries} попыток: ${url} (${detail})`,
  );
};

/**
 * Скачать текст
 */
export const fetchText = async (
  url: string,
  options: IFetchOptions = {},
): Promise<string> => {
  const res = await fetchWithRetry(url, options);

  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);

  return res.text();
};

/**
 * Скачать JSON
 */
export const fetchJson = async <T>(
  url: string,
  options: IFetchOptions = {},
): Promise<T> => {
  const res = await fetchWithRetry(url, options);

  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);

  return (await res.json()) as T;
};

/**
 * Скачать бинарный файл
 */
export const fetchBuffer = async (
  url: string,
  options: IFetchOptions = {},
): Promise<Buffer> => {
  const res = await fetchWithRetry(url, options);

  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);

  return Buffer.from(await res.arrayBuffer());
};
