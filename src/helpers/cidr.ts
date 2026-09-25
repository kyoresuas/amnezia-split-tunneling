import { IpFamily } from "@/types/shared";

export interface ICidr {
  // Семейство адресов
  family: IpFamily;
  // Первый адрес
  start: bigint;
  // Последний адрес
  end: bigint;
  // Длина префикса
  prefix: number;
}

export interface IRange {
  family: IpFamily;
  start: bigint;
  end: bigint;
}

// Число бит адреса по семейству
const BITS: Record<IpFamily, number> = {
  [IpFamily.V4]: 32,
  [IpFamily.V6]: 128,
};

// Регулярное выражение IPv4-адреса
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// Максимальное значение адреса по семейству
const MAX: Record<IpFamily, bigint> = {
  [IpFamily.V4]: (1n << 32n) - 1n,
  [IpFamily.V6]: (1n << 128n) - 1n,
};

/**
 * Разобрать IPv4 в число или вернуть null
 */
const parseIpv4 = (ip: string): bigint | null => {
  const m = IPV4_RE.exec(ip);

  if (!m) return null;

  let n = 0n;

  for (let i = 1; i <= 4; i++) {
    const octet = Number(m[i]);

    if (octet > 255) return null;

    n = (n << 8n) | BigInt(octet);
  }

  return n;
};

/**
 * Разобрать IPv6 в число или вернуть null
 */
const parseIpv6 = (ip: string): bigint | null => {
  if (!ip.includes(":")) return null;

  let text = ip;

  // Встроенный IPv4 в конце, например ::ffff:1.2.3.4
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);

  if (tail.includes(".")) {
    const v4 = parseIpv4(tail);

    if (v4 === null) return null;

    const high = (v4 >> 16n).toString(16);
    const low = (v4 & 0xffffn).toString(16);

    text = `${text.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const parts = text.split("::");

  if (parts.length > 2) return null;

  const head = parts[0] ? parts[0].split(":") : [];
  const rest = parts.length === 2 && parts[1] ? parts[1].split(":") : [];

  if (parts.length === 1 && head.length !== 8) return null;

  const missing = 8 - head.length - rest.length;

  if (parts.length === 2 && missing < 1) return null;

  const groups = [
    ...head,
    ...Array.from({ length: parts.length === 2 ? missing : 0 }, () => "0"),
    ...rest,
  ];

  if (groups.length !== 8) return null;

  let n = 0n;

  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;

    n = (n << 16n) | BigInt(parseInt(group, 16));
  }

  return n;
};

/**
 * Определить семейство адреса или вернуть null
 */
export const ipFamily = (ip: string): IpFamily | null => {
  if (parseIpv4(ip) !== null) return IpFamily.V4;
  if (parseIpv6(ip) !== null) return IpFamily.V6;

  return null;
};

/**
 * Разобрать IP-адрес в число или вернуть null
 */
export const ipToBigInt = (
  ip: string,
): { family: IpFamily; value: bigint } | null => {
  const v4 = parseIpv4(ip);

  if (v4 !== null) return { family: IpFamily.V4, value: v4 };

  const v6 = parseIpv6(ip);

  if (v6 !== null) return { family: IpFamily.V6, value: v6 };

  return null;
};

/**
 * Преобразовать число в текстовый адрес
 */
export const bigIntToIp = (value: bigint, family: IpFamily): string => {
  if (family === IpFamily.V4) {
    return [
      (value >> 24n) & 0xffn,
      (value >> 16n) & 0xffn,
      (value >> 8n) & 0xffn,
      value & 0xffn,
    ].join(".");
  }

  const groups: string[] = [];

  for (let i = 7; i >= 0; i--) {
    groups.push(((value >> BigInt(i * 16)) & 0xffffn).toString(16));
  }

  // Сжать самую длинную последовательность нулевых групп
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let i = 0; i < 8; i++) {
    if (groups[i] === "0") {
      if (currentStart === -1) currentStart = i;
      currentLength++;

      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }
    } else {
      currentStart = -1;
      currentLength = 0;
    }
  }

  if (bestLength < 2) return groups.join(":");

  const before = groups.slice(0, bestStart).join(":");
  const after = groups.slice(bestStart + bestLength).join(":");

  return `${before}::${after}`;
};

/**
 * Разобрать CIDR или одиночный адрес в диапазон или вернуть null
 */
export const parseCidr = (input: string): ICidr | null => {
  const text = input.trim();
  const slash = text.indexOf("/");
  const ipPart = slash === -1 ? text : text.slice(0, slash);
  const parsed = ipToBigInt(ipPart);

  if (!parsed) return null;

  const bits = BITS[parsed.family];
  let prefix = bits;

  if (slash !== -1) {
    const prefixText = text.slice(slash + 1);

    if (!/^\d{1,3}$/.test(prefixText)) return null;

    prefix = Number(prefixText);

    if (prefix > bits) return null;
  }

  const hostBits = BigInt(bits - prefix);
  const start = (parsed.value >> hostBits) << hostBits;
  const end = start | ((1n << hostBits) - 1n);

  return { family: parsed.family, start, end, prefix };
};

/**
 * Проверить, что строка является валидным CIDR или адресом
 */
export const isValidCidr = (input: string): boolean =>
  parseCidr(input) !== null;

/**
 * Привести CIDR к каноническому виду: нулевые биты хоста, явный префикс
 */
export const normalizeCidr = (input: string): string | null => {
  const cidr = parseCidr(input);

  if (!cidr) return null;

  return `${bigIntToIp(cidr.start, cidr.family)}/${cidr.prefix}`;
};

/**
 * Количество завершающих нулевых бит числа
 */
const trailingZeros = (value: bigint, bits: number): number => {
  if (value === 0n) return bits;

  let count = 0;
  let n = value;

  while ((n & 1n) === 0n && count < bits) {
    n >>= 1n;
    count++;
  }

  return count;
};

/**
 * Разбить диапазон адресов на минимальный набор CIDR
 */
export const rangeToCidrs = (range: IRange): string[] => {
  const bits = BITS[range.family];
  const out: string[] = [];
  let current = range.start;

  while (current <= range.end) {
    const remaining = range.end - current + 1n;
    let size = Math.min(trailingZeros(current, bits), bits);

    while (size > 0 && 1n << BigInt(size) > remaining) size--;

    out.push(`${bigIntToIp(current, range.family)}/${bits - size}`);
    current += 1n << BigInt(size);

    if (current > MAX[range.family]) break;
  }

  return out;
};

/**
 * Сгруппировать CIDR по семействам и превратить в диапазоны
 */
const toRanges = (cidrs: readonly string[]): Map<IpFamily, IRange[]> => {
  const byFamily = new Map<IpFamily, IRange[]>();

  for (const raw of cidrs) {
    const cidr = parseCidr(raw);

    if (!cidr) throw new Error(`Невалидный CIDR: ${raw}`);

    const list = byFamily.get(cidr.family) ?? [];

    list.push({ family: cidr.family, start: cidr.start, end: cidr.end });
    byFamily.set(cidr.family, list);
  }

  return byFamily;
};

/**
 * Слить пересекающиеся и смежные диапазоны одного семейства
 */
const mergeRanges = (ranges: IRange[]): IRange[] => {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) =>
    a.start === b.start ? Number(a.end - b.end) : a.start < b.start ? -1 : 1,
  );
  const merged: IRange[] = [];
  let current = { ...sorted[0]! };

  for (let i = 1; i < sorted.length; i++) {
    const range = sorted[i]!;

    if (range.start <= current.end + 1n) {
      if (range.end > current.end) current.end = range.end;
    } else {
      merged.push(current);
      current = { ...range };
    }
  }

  merged.push(current);

  return merged;
};

/**
 * Порядок семейств в результатах: сначала IPv4, потом IPv6
 */
const FAMILY_ORDER: IpFamily[] = [IpFamily.V4, IpFamily.V6];

/**
 * Превратить диапазоны в отсортированный список CIDR
 */
const rangesToCidrs = (byFamily: Map<IpFamily, IRange[]>): string[] => {
  const out: string[] = [];

  for (const family of FAMILY_ORDER) {
    for (const range of byFamily.get(family) ?? []) {
      out.push(...rangeToCidrs(range));
    }
  }

  return out;
};

/**
 * Агрегировать список CIDR: убрать дубли, слить смежные и вложенные
 */
export const aggregate = (cidrs: readonly string[]): string[] => {
  const byFamily = toRanges(cidrs);
  const merged = new Map<IpFamily, IRange[]>();

  for (const [family, ranges] of byFamily) {
    merged.set(family, mergeRanges(ranges));
  }

  return rangesToCidrs(merged);
};

/**
 * Вычесть одни подсети из других
 */
export const subtract = (
  from: readonly string[],
  remove: readonly string[],
): string[] => {
  const fromByFamily = toRanges(from);
  const removeByFamily = toRanges(remove);
  const result = new Map<IpFamily, IRange[]>();

  for (const [family, ranges] of fromByFamily) {
    const base = mergeRanges(ranges);
    const holes = mergeRanges(removeByFamily.get(family) ?? []);
    const pieces: IRange[] = [];

    for (const range of base) {
      let cursor = range.start;

      for (const hole of holes) {
        if (hole.end < cursor) continue;
        if (hole.start > range.end) break;

        if (hole.start > cursor) {
          pieces.push({ family, start: cursor, end: hole.start - 1n });
        }

        cursor = hole.end + 1n;

        if (cursor > range.end) break;
      }

      if (cursor <= range.end) {
        pieces.push({ family, start: cursor, end: range.end });
      }
    }

    result.set(family, pieces);
  }

  return rangesToCidrs(result);
};

/**
 * Дополнение списка подсетей до всего адресного пространства семейства
 */
export const invert = (
  cidrs: readonly string[],
  family: IpFamily,
): string[] => {
  const all = family === IpFamily.V4 ? "0.0.0.0/0" : "::/0";
  const sameFamily = cidrs.filter((c) => parseCidr(c)?.family === family);

  return subtract([all], sameFamily);
};

/**
 * Отсортировать CIDR по семейству, адресу и префиксу
 */
export const sortCidrs = (cidrs: readonly string[]): string[] => {
  const parsed = cidrs.map((raw) => {
    const cidr = parseCidr(raw);

    if (!cidr) throw new Error(`Невалидный CIDR: ${raw}`);

    return { raw, cidr };
  });

  parsed.sort((a, b) => {
    if (a.cidr.family !== b.cidr.family) {
      return a.cidr.family - b.cidr.family;
    }

    if (a.cidr.start !== b.cidr.start) {
      return a.cidr.start < b.cidr.start ? -1 : 1;
    }

    return a.cidr.prefix - b.cidr.prefix;
  });

  return parsed.map((p) => p.raw);
};

/**
 * Разделить список CIDR по семействам
 */
export const splitByFamily = (
  cidrs: readonly string[],
): { ipv4: string[]; ipv6: string[] } => {
  const ipv4: string[] = [];
  const ipv6: string[] = [];

  for (const raw of cidrs) {
    const cidr = parseCidr(raw);

    if (!cidr) continue;

    (cidr.family === IpFamily.V4 ? ipv4 : ipv6).push(raw);
  }

  return { ipv4, ipv6 };
};

/**
 * Индекс для быстрой проверки вхождения адреса
 */
export class CidrIndex {
  private readonly ranges: Map<IpFamily, Array<IRange & { cidr: string }>>;

  constructor(cidrs: readonly string[]) {
    this.ranges = new Map();

    for (const raw of cidrs) {
      const cidr = parseCidr(raw);

      if (!cidr) continue;

      const list = this.ranges.get(cidr.family) ?? [];

      list.push({ ...cidr, cidr: raw });
      this.ranges.set(cidr.family, list);
    }

    for (const list of this.ranges.values()) {
      list.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    }
  }

  /**
   * Найти подсеть, содержащую адрес, или null
   */
  find(ip: string): string | null {
    const parsed = ipToBigInt(ip);

    if (!parsed) return null;

    const list = this.ranges.get(parsed.family) ?? [];
    let low = 0;
    let high = list.length - 1;
    let candidate: (IRange & { cidr: string }) | null = null;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const range = list[mid]!;

      if (range.start <= parsed.value) {
        candidate = range;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Список агрегирован, поэтому достаточно проверить ближайший слева
    if (candidate && candidate.end >= parsed.value) return candidate.cidr;

    // На неагрегированном списке вложенная подсеть могла быть левее
    for (let i = (candidate ? list.indexOf(candidate) : 0) - 1; i >= 0; i--) {
      const range = list[i]!;

      if (range.end >= parsed.value) return range.cidr;
      if (
        range.end < parsed.value &&
        range.start < parsed.value - (1n << 24n)
      ) {
        break;
      }
    }

    return null;
  }

  /**
   * Проверить вхождение адреса
   */
  has(ip: string): boolean {
    return this.find(ip) !== null;
  }
}

/**
 * Подсети, которым не место в списках: приватные, loopback, multicast, документация
 */
const BOGON_CIDRS = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "::/128",
  "::1/128",
  "::ffff:0:0/96",
  "64:ff9b::/96",
  "100::/64",
  "2001::/32",
  "2001:db8::/32",
  "2002::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
];

// Индекс bogon-подсетей
const bogonIndex = new CidrIndex(BOGON_CIDRS);

/**
 * Проверить, что подсеть целиком лежит в bogon-пространстве
 */
export const isBogon = (input: string): boolean => {
  const cidr = parseCidr(input);

  if (!cidr) return true;

  const start = bogonIndex.find(bigIntToIp(cidr.start, cidr.family));
  const end = bogonIndex.find(bigIntToIp(cidr.end, cidr.family));

  return start !== null && start === end;
};

/**
 * Маска подсети IPv4 из длины префикса
 */
export const prefixToMask = (prefix: number): string => {
  const value =
    prefix === 0
      ? 0n
      : (MAX[IpFamily.V4] << BigInt(32 - prefix)) & MAX[IpFamily.V4];

  return bigIntToIp(value, IpFamily.V4);
};

/**
 * Число адресов в списке подсетей
 */
export const countAddresses = (cidrs: readonly string[]): bigint => {
  let total = 0n;

  for (const raw of cidrs) {
    const cidr = parseCidr(raw);

    if (cidr) total += cidr.end - cidr.start + 1n;
  }

  return total;
};

/**
 * Сколько подсетей из second пересекаются хотя бы с одной подсетью из first
 */
export const countIntersecting = (
  first: readonly string[],
  second: readonly string[],
): number => {
  const merged = new Map<IpFamily, IRange[]>();

  for (const [family, ranges] of toRanges(first)) {
    merged.set(family, mergeRanges(ranges));
  }

  let count = 0;

  for (const raw of second) {
    const cidr = parseCidr(raw);

    if (!cidr) continue;

    const ranges = merged.get(cidr.family) ?? [];
    let low = 0;
    let high = ranges.length - 1;

    // Бинарный поиск последнего диапазона, начинающегося не позже конца подсети
    while (low <= high) {
      const mid = (low + high) >> 1;

      if (ranges[mid]!.start <= cidr.end) low = mid + 1;
      else high = mid - 1;
    }

    if (high >= 0 && ranges[high]!.end >= cidr.start) count++;
  }

  return count;
};
