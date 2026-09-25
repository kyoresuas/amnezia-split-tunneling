import { TimeContract } from "@/contracts/time";

/**
 * Параметры сетевых запросов
 */
export const HttpContract = {
  // User-Agent для внешних сервисов
  USER_AGENT:
    "ru-direct (https://github.com/kyoresuas/ru-direct)",
  // Число повторов при ошибке
  RETRIES: 3,
  // Пауза между повторами
  RETRY_DELAY: 2 * TimeContract.SECOND,
  // Таймаут одного запроса
  TIMEOUT: 15 * TimeContract.SECOND,
} as const;
