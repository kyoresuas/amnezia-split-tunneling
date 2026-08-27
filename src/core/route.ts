import { isValidCidr } from "./cidr.js";

export type ResolverMode = "prefix" | "trusted-prefix";

export interface NetworkInfo {
  prefix: string | null;
  asns: number[];
}

export interface SelectedRoute {
  cidr: string | null;
  trustedPrefix: boolean;
}

/**
 * Выбирает BGP-префикс для доверенного ASN, иначе возвращает /32
 */
export function selectRoute(
  ip: string,
  info: NetworkInfo | null,
  trustedAsns: Iterable<number>,
  mode: ResolverMode,
): SelectedRoute {
  if (mode === "prefix") {
    return { cidr: info?.prefix ?? null, trustedPrefix: false };
  }

  const trusted = new Set(trustedAsns);
  const originIsTrusted = info?.asns.some((asn) => trusted.has(asn)) ?? false;
  if (originIsTrusted && info?.prefix && isValidCidr(info.prefix)) {
    return { cidr: info.prefix, trustedPrefix: true };
  }

  const exact = `${ip}/32`;
  return {
    cidr: isValidCidr(exact) ? exact : null,
    trustedPrefix: false,
  };
}
