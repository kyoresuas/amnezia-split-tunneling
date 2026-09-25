import { Tier } from "@/types/shared";
import { ITierData } from "@/types/build";
import { it, expect, describe } from "vitest";
import { buildGeoip, buildGeosite } from "@/services/formats/geodata";

/**
 * Прочитать varint из буфера
 */
const readVarint = (buffer: Buffer, offset: number): [number, number] => {
  let result = 0;
  let shift = 0;
  let position = offset;

  for (;;) {
    const byte = buffer[position++]!;

    result |= (byte & 0x7f) << shift;
    shift += 7;

    if (byte < 0x80) return [result, position];
  }
};

/**
 * Разобрать protobuf-сообщение в список полей
 */
const parse = (
  buffer: Buffer,
): Array<{ field: number; value: number | Buffer }> => {
  const fields: Array<{ field: number; value: number | Buffer }> = [];
  let position = 0;

  while (position < buffer.length) {
    const [tag, afterTag] = readVarint(buffer, position);
    const field = tag >> 3;
    const wire = tag & 7;

    if (wire === 0) {
      const [value, next] = readVarint(buffer, afterTag);

      fields.push({ field, value });
      position = next;
    } else {
      const [length, start] = readVarint(buffer, afterTag);

      fields.push({ field, value: buffer.subarray(start, start + length) });
      position = start + length;
    }
  }

  return fields;
};

const tier: ITierData = {
  tier: Tier.LITE,
  id: "ru-lite",
  ipv4: ["5.61.16.0/21"],
  ipv6: ["2a02:6b8::/32"],
  domains: ["ozon.ru"],
  domainIps: new Map(),
  services: 1,
  categories: 1,
};

describe("geoip.dat и geosite.dat", () => {
  it("geoip: тег в верхнем регистре, адрес как байты, префикс как число", () => {
    const entries = parse(buildGeoip([tier]));

    expect(entries).toHaveLength(1);

    const geoip = parse(entries[0]!.value as Buffer);

    expect((geoip[0]!.value as Buffer).toString()).toBe("RU-LITE");

    const first = parse(geoip[1]!.value as Buffer);
    const second = parse(geoip[2]!.value as Buffer);

    expect([...(first[0]!.value as Buffer)]).toEqual([5, 61, 16, 0]);
    expect(first[1]!.value).toBe(21);
    expect((second[0]!.value as Buffer).length).toBe(16);
    expect(second[1]!.value).toBe(32);
  });

  it("geosite: домен с типом RootDomain", () => {
    const entries = parse(buildGeosite([tier]));
    const geosite = parse(entries[0]!.value as Buffer);
    const domain = parse(geosite[1]!.value as Buffer);

    expect((geosite[0]!.value as Buffer).toString()).toBe("RU-LITE");
    expect(domain[0]!.value).toBe(2);
    expect((domain[1]!.value as Buffer).toString()).toBe("ozon.ru");
  });

  it("geosite: уровень без доменов пропускается", () => {
    expect(buildGeosite([{ ...tier, domains: [] }]).length).toBe(0);
  });
});
