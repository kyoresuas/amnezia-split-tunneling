/**
 * Запускает массив async-функций, держа не более concurrency одновременно
 */
export async function pLimit<T>(
  fns: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results = new Array<T>(fns.length);
  let i = 0;
  const worker = async (): Promise<void> => {
    while (i < fns.length) {
      const idx = i++;
      const fn = fns[idx]!;
      results[idx] = await fn();
    }
  };
  const n = Math.max(1, Math.min(concurrency, fns.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}
