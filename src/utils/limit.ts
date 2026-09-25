/**
 * Выполнить async-функции, держа не более concurrency одновременно
 */
export const pLimit = async <T>(
  fns: ReadonlyArray<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> => {
  const results = new Array<T>(fns.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < fns.length) {
      const index = next++;
      const fn = fns[index]!;

      results[index] = await fn();
    }
  };

  const workers = Math.max(1, Math.min(concurrency, fns.length));

  await Promise.all(Array.from({ length: workers }, worker));

  return results;
};

/**
 * Подождать указанное число миллисекунд
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
