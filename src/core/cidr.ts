export interface IpRange {
  start: number;
  end: number;
}

// Регулярное выражение для проверки CIDR-блока
const CIDR_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

/**
 * Конвертирует IP-адрес в целое число
 */
export function ipToInt(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) throw new Error(`Невалидный IP: ${ip}`);
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) {
      throw new Error(`Невалидный IP: ${ip}`);
    }
    n = (n * 256 + o) >>> 0;
  }
  return n >>> 0;
}

/**
 * Конвертирует целое число в IP-адрес
 */
export function intToIp(n: number): string {
  const u = n >>> 0;
  return [
    (u >>> 24) & 0xff,
    (u >>> 16) & 0xff,
    (u >>> 8) & 0xff,
    u & 0xff,
  ].join(".");
}

/**
 * Конвертирует маску подсети в целое число
 */
function prefixMask(prefix: number): number {
  if (prefix < 0 || prefix > 32)
    throw new Error(`Невалидный prefix: ${prefix}`);
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/**
 * Конвертирует CIDR в диапазон IP-адресов
 */
export function cidrToRange(cidr: string): IpRange {
  const m = CIDR_RE.exec(cidr.trim());
  if (!m) throw new Error(`Невалидный CIDR: ${cidr}`);
  const prefix = Number(m[5]);
  if (prefix < 0 || prefix > 32) {
    throw new Error(`Невалидный CIDR: ${cidr}`);
  }
  const ip = ipToInt(`${m[1]}.${m[2]}.${m[3]}.${m[4]}`);
  const mask = prefixMask(prefix);
  const start = (ip & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return { start, end };
}

/**
 * Конвертирует число в количество нулевых битов справа
 */
function ctz32(n: number): number {
  if (n === 0) return 32;
  const lowBit = (n & -n) >>> 0;
  return 31 - Math.clz32(lowBit);
}

/**
 * Конвертирует диапазон IP-адресов в CIDR-блоки
 */
export function rangeToCidrs(start: number, end: number): string[] {
  if (start > end) return [];
  if (start < 0 || end > 0xffffffff) {
    throw new Error(`Диапазон вне IPv4: ${start}-${end}`);
  }
  const out: string[] = [];
  let s = start;
  while (s <= end) {
    const maxByAlign = ctz32(s);
    const remaining = end - s + 1;
    let maxBySize = 0;
    while (maxBySize < 32 && 2 ** (maxBySize + 1) <= remaining) maxBySize++;
    const size = Math.min(maxByAlign, maxBySize);
    const prefix = 32 - size;
    out.push(`${intToIp(s)}/${prefix}`);
    const step = 2 ** size;
    s += step;
    if (s > 0xffffffff) break;
  }
  return out;
}

/**
 * Проверяет, является ли CIDR-блок валидным
 */
export function isValidCidr(s: string): boolean {
  const m = CIDR_RE.exec(s.trim());
  if (!m) return false;
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i]);
    if (o < 0 || o > 255) return false;
  }
  const prefix = Number(m[5]);
  return prefix >= 0 && prefix <= 32;
}

/**
 * Список частных CIDR-блоков
 */
const PRIVATE_CIDRS: IpRange[] = [
  cidrToRange("0.0.0.0/8"),
  cidrToRange("10.0.0.0/8"),
  cidrToRange("100.64.0.0/10"),
  cidrToRange("127.0.0.0/8"),
  cidrToRange("169.254.0.0/16"),
  cidrToRange("172.16.0.0/12"),
  cidrToRange("192.0.0.0/24"),
  cidrToRange("192.0.2.0/24"),
  cidrToRange("192.168.0.0/16"),
  cidrToRange("198.18.0.0/15"),
  cidrToRange("198.51.100.0/24"),
  cidrToRange("203.0.113.0/24"),
  cidrToRange("224.0.0.0/4"),
  cidrToRange("240.0.0.0/4"),
];

/**
 * Проверяет, является ли CIDR-блок частным
 */
export function isPrivateCidr(cidr: string): boolean {
  const { start, end } = cidrToRange(cidr);
  for (const p of PRIVATE_CIDRS) {
    if (start >= p.start && end <= p.end) return true;
  }
  return false;
}

/**
 * Конвертирует массив CIDR-блоков в массив диапазонов IP-адресов
 */
function rangesFromCidrs(cidrs: string[]): IpRange[] {
  return cidrs.map(cidrToRange);
}

/**
 * Сливает диапазоны IP-адресов
 */
function mergeRanges(ranges: IpRange[]): IpRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) =>
    a.start === b.start ? a.end - b.end : a.start - b.start,
  );
  const merged: IpRange[] = [];
  let cur: IpRange = { ...sorted[0]! };
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i]!;
    if (r.start <= cur.end + 1) {
      if (r.end > cur.end) cur.end = r.end;
    } else {
      merged.push(cur);
      cur = { ...r };
    }
  }
  merged.push(cur);
  return merged;
}

/**
 * Сливает смежные и перекрывающиеся CIDR-блоки
 */
export function aggregate(cidrs: string[]): string[] {
  if (cidrs.length === 0) return [];
  const merged = mergeRanges(rangesFromCidrs(cidrs));
  const out: string[] = [];
  for (const r of merged) {
    for (const c of rangeToCidrs(r.start, r.end)) out.push(c);
  }
  return out;
}

/**
 * Вычитает CIDR-блоки из массива
 */
export function subtract(from: string[], remove: string[]): string[] {
  if (from.length === 0) return [];
  const fromMerged = mergeRanges(rangesFromCidrs(from));
  if (remove.length === 0) {
    const out: string[] = [];
    for (const r of fromMerged) {
      for (const c of rangeToCidrs(r.start, r.end)) out.push(c);
    }
    return out;
  }
  const removeMerged = mergeRanges(rangesFromCidrs(remove));

  const result: IpRange[] = [];
  for (const f of fromMerged) {
    let pieces: IpRange[] = [{ ...f }];
    for (const r of removeMerged) {
      if (r.end < f.start || r.start > f.end) continue;
      const next: IpRange[] = [];
      for (const p of pieces) {
        if (r.end < p.start || r.start > p.end) {
          next.push(p);
          continue;
        }
        if (r.start > p.start) next.push({ start: p.start, end: r.start - 1 });
        if (r.end < p.end) next.push({ start: r.end + 1, end: p.end });
      }
      pieces = next;
      if (pieces.length === 0) break;
    }
    for (const p of pieces) result.push(p);
  }

  const out: string[] = [];
  for (const r of result) {
    for (const c of rangeToCidrs(r.start, r.end)) out.push(c);
  }
  return out;
}

/**
 * Проверяет, содержит ли массив CIDR-блоков IP-адрес
 */
export function contains(cidrs: string[], ip: string): string | null {
  const n = ipToInt(ip);
  for (const c of cidrs) {
    const { start, end } = cidrToRange(c);
    if (n >= start && n <= end) return c;
  }
  return null;
}
