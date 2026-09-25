/**
 * Привести строку к целому числу
 */
export const toInt = (value?: string): number | undefined => {
  if (!value?.trim()) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Привести строку к булеву значению
 */
export const toBool = (value?: string): boolean | undefined => {
  if (!value?.trim()) return undefined;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

/**
 * Исключить null/undefined из массива
 */
export const isNotNull = <T>(x: T | null | undefined): x is T => x != null;

/**
 * Убрать дубликаты, сохранив порядок
 */
export const unique = <T>(items: Iterable<T>): T[] => [...new Set(items)];

/**
 * Разбить массив на части фиксированного размера
 */
export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }

  return out;
};

/**
 * Отформатировать число с разделителями тысяч
 */
export const formatNumber = (value: number): string =>
  value.toLocaleString("ru-RU");
