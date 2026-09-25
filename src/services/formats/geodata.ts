import { IpFamily } from "@/types/shared";
import { ITierData } from "@/types/build";
import { parseCidr } from "@/helpers/cidr";
import { bytesField, varintField } from "@/helpers/protobuf";

/**
 * Байты адреса для protobuf CIDR
 */
const ipBytes = (cidr: string): Buffer => {
  const parsed = parseCidr(cidr)!;
  const size = parsed.family === IpFamily.V4 ? 4 : 16;
  const bytes = Buffer.alloc(size);
  let value = parsed.start;

  for (let i = size - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }

  return bytes;
};

/**
 * Собрать geoip.dat: тег для каждого уровня в верхнем регистре
 */
export const buildGeoip = (tiers: readonly ITierData[]): Buffer => {
  const entries: Buffer[] = [];

  for (const tier of tiers) {
    const cidrs = [...tier.ipv4, ...tier.ipv6].map((cidr) => {
      const parsed = parseCidr(cidr)!;

      return bytesField(
        2,
        Buffer.concat([
          bytesField(1, ipBytes(cidr)),
          varintField(2, parsed.prefix),
        ]),
      );
    });

    entries.push(
      bytesField(
        1,
        Buffer.concat([bytesField(1, tier.id.toUpperCase()), ...cidrs]),
      ),
    );
  }

  return Buffer.concat(entries);
};

// Тип домена в geosite: суффикс с поддоменами
const DOMAIN_TYPE_ROOT = 2;

/**
 * Собрать geosite.dat: домены каждого уровня с типом RootDomain
 */
export const buildGeosite = (tiers: readonly ITierData[]): Buffer => {
  const entries: Buffer[] = [];

  for (const tier of tiers) {
    if (tier.domains.length === 0) continue;

    const domains = tier.domains.map((domain) =>
      bytesField(
        2,
        Buffer.concat([
          varintField(1, DOMAIN_TYPE_ROOT),
          bytesField(2, domain),
        ]),
      ),
    );

    entries.push(
      bytesField(
        1,
        Buffer.concat([bytesField(1, tier.id.toUpperCase()), ...domains]),
      ),
    );
  }

  return Buffer.concat(entries);
};
