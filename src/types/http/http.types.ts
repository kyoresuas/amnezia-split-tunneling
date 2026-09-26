export interface IFetchOptions {
  // Заголовки запроса
  headers?: Record<string, string>;
  // Таймаут одного запроса
  timeout?: number;
  // Число повторов
  retries?: number;
  // Не логировать повторы
  quiet?: boolean;
}
