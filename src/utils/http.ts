import { log } from "./log.js";

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  userAgent?: string;
  retryDelayMs?: number;
}

const DEFAULT_UA =
  "amnezia-split-tunneling (github.com/kyoresuas/amnezia-split-tunneling)";

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * fetch с таймаутом и ретраями
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const retries = options.retries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 2000;
  const userAgent = options.userAgent ?? DEFAULT_UA;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        log.warn(`fetch ${url} попытка ${attempt}/${retries} не удалась`);
        await sleep(retryDelayMs);
      }
    }
  }
  const detail =
    lastErr instanceof Error ? lastErr.message : String(lastErr ?? "");
  throw new Error(`fetch ${url} не удался после ${retries} попыток: ${detail}`);
}
