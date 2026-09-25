import {
  invert,
  isBogon,
  subtract,
  aggregate,
  CidrIndex,
  parseCidr,
  sortCidrs,
  bigIntToIp,
  ipToBigInt,
  isValidCidr,
  prefixToMask,
  rangeToCidrs,
  normalizeCidr,
  splitByFamily,
  countAddresses,
  countIntersecting,
} from "@/helpers/cidr";
import { IpFamily } from "@/types/shared";
import { it, expect, describe } from "vitest";

describe("парсинг адресов", () => {
  it("разбирает IPv4 и IPv6", () => {
    expect(ipToBigInt("1.2.3.4")).toEqual({
      family: IpFamily.V4,
      value: 16909060n,
    });
    expect(ipToBigInt("::1")).toEqual({ family: IpFamily.V6, value: 1n });
    expect(ipToBigInt("2a02:6b8::")?.family).toBe(IpFamily.V6);
    expect(ipToBigInt("::ffff:1.2.3.4")?.value).toBe(
      0xffff00000000n + 16909060n,
    );
  });

  it("отклоняет мусор", () => {
    expect(ipToBigInt("256.1.1.1")).toBeNull();
    expect(ipToBigInt("1.2.3")).toBeNull();
    expect(ipToBigInt("2a02::6b8::1")).toBeNull();
    expect(ipToBigInt("example.ru")).toBeNull();
    expect(isValidCidr("1.2.3.0/33")).toBe(false);
    expect(isValidCidr("2a02:6b8::/129")).toBe(false);
  });

  it("печатает IPv6 в сжатом виде", () => {
    expect(bigIntToIp(1n, IpFamily.V6)).toBe("::1");
    expect(bigIntToIp(0x2a0206b8n << 96n, IpFamily.V6)).toBe("2a02:6b8::");
    expect(normalizeCidr("2A02:06B8:0000:0000::0/32")).toBe("2a02:6b8::/32");
  });

  it("нормализует CIDR, обнуляя биты хоста", () => {
    expect(normalizeCidr("1.2.3.77/24")).toBe("1.2.3.0/24");
    expect(normalizeCidr("1.2.3.4")).toBe("1.2.3.4/32");
    expect(parseCidr("10.0.0.0/8")?.end).toBe(184549375n);
  });
});

describe("агрегация", () => {
  it("сливает смежные и вложенные подсети", () => {
    expect(
      aggregate(["1.0.0.0/25", "1.0.0.128/25", "1.0.0.0/24", "2.0.0.0/24"]),
    ).toEqual(["1.0.0.0/24", "2.0.0.0/24"]);
  });

  it("сливает диапазон, не выровненный по степени двойки", () => {
    expect(aggregate(["1.0.0.0/24", "1.0.1.0/24", "1.0.2.0/24"])).toEqual([
      "1.0.0.0/23",
      "1.0.2.0/24",
    ]);
  });

  it("держит семейства раздельно, IPv4 первым", () => {
    expect(aggregate(["2a02:6b8::/32", "1.0.0.0/24", "2a02:6b8::/33"])).toEqual(
      ["1.0.0.0/24", "2a02:6b8::/32"],
    );
  });

  it("бросает ошибку на невалидной записи", () => {
    expect(() => aggregate(["1.0.0.0/24", "мусор"])).toThrow();
  });
});

describe("вычитание и инверсия", () => {
  it("вырезает дыру из подсети", () => {
    expect(subtract(["1.0.0.0/24"], ["1.0.0.128/26"])).toEqual([
      "1.0.0.0/25",
      "1.0.0.192/26",
    ]);
  });

  it("не трогает подсети без пересечений", () => {
    expect(subtract(["1.0.0.0/24", "3.0.0.0/24"], ["2.0.0.0/8"])).toEqual([
      "1.0.0.0/24",
      "3.0.0.0/24",
    ]);
  });

  it("возвращает пустой список, если вычли всё", () => {
    expect(subtract(["1.0.0.0/24"], ["0.0.0.0/0"])).toEqual([]);
  });

  it("инвертирует список в дополнение до всего пространства", () => {
    const inverted = invert(["128.0.0.0/1"], IpFamily.V4);

    expect(inverted).toEqual(["0.0.0.0/1"]);
    expect(invert([], IpFamily.V6)).toEqual(["::/0"]);
  });
});

describe("диапазоны и сортировка", () => {
  it("разбивает диапазон на минимальные CIDR", () => {
    expect(
      rangeToCidrs({ family: IpFamily.V4, start: 16777216n, end: 16777471n }),
    ).toEqual(["1.0.0.0/24"]);
    expect(
      rangeToCidrs({ family: IpFamily.V4, start: 16777217n, end: 16777219n }),
    ).toEqual(["1.0.0.1/32", "1.0.0.2/31"]);
  });

  it("сортирует по семейству, адресу и префиксу", () => {
    expect(
      sortCidrs(["2a02::/16", "10.0.0.0/8", "1.0.0.0/24", "1.0.0.0/16"]),
    ).toEqual(["1.0.0.0/16", "1.0.0.0/24", "10.0.0.0/8", "2a02::/16"]);
  });

  it("делит список по семействам", () => {
    expect(splitByFamily(["1.0.0.0/24", "2a02::/16"])).toEqual({
      ipv4: ["1.0.0.0/24"],
      ipv6: ["2a02::/16"],
    });
  });

  it("считает адреса", () => {
    expect(countAddresses(["1.0.0.0/24", "1.0.1.0/25"])).toBe(384n);
  });

  it("считает пересекающиеся подсети", () => {
    expect(
      countIntersecting(
        ["1.0.0.0/24", "2.0.0.0/24"],
        ["1.0.0.128/25", "3.0.0.0/8", "2.0.0.5/32"],
      ),
    ).toBe(2);
    expect(countIntersecting(["1.0.0.0/24"], ["2a02::/16"])).toBe(0);
    expect(countIntersecting(["0.0.0.0/0"], ["8.8.8.8/32"])).toBe(1);
  });
});

describe("индекс и служебные функции", () => {
  it("находит подсеть для адреса бинарным поиском", () => {
    const index = new CidrIndex(["10.0.0.0/8", "1.0.0.0/24", "2a02:6b8::/32"]);

    expect(index.find("1.0.0.7")).toBe("1.0.0.0/24");
    expect(index.find("10.200.1.1")).toBe("10.0.0.0/8");
    expect(index.find("2a02:6b8:a::a")).toBe("2a02:6b8::/32");
    expect(index.find("8.8.8.8")).toBeNull();
    expect(index.has("не адрес")).toBe(false);
  });

  it("распознаёт bogon-подсети", () => {
    expect(isBogon("192.168.1.0/24")).toBe(true);
    expect(isBogon("10.0.0.0/8")).toBe(true);
    expect(isBogon("fe80::/10")).toBe(true);
    expect(isBogon("77.88.8.8/32")).toBe(false);
    expect(isBogon("0.0.0.0/0")).toBe(false);
  });

  it("считает маску из префикса", () => {
    expect(prefixToMask(24)).toBe("255.255.255.0");
    expect(prefixToMask(21)).toBe("255.255.248.0");
    expect(prefixToMask(0)).toBe("0.0.0.0");
    expect(prefixToMask(32)).toBe("255.255.255.255");
  });
});
