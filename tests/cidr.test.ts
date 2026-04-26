import {
  ipToInt,
  intToIp,
  contains,
  subtract,
  aggregate,
  isValidCidr,
  cidrToRange,
  rangeToCidrs,
  isPrivateCidr,
} from "../src/core/cidr.js";
import { describe, it, expect } from "vitest";

describe("ipToInt / intToIp", () => {
  it("конвертирует туда и обратно", () => {
    expect(ipToInt("0.0.0.0")).toBe(0);
    expect(ipToInt("255.255.255.255")).toBe(0xffffffff);
    expect(ipToInt("1.2.3.4")).toBe(0x01020304);
    expect(intToIp(0)).toBe("0.0.0.0");
    expect(intToIp(0xffffffff)).toBe("255.255.255.255");
    expect(intToIp(0x01020304)).toBe("1.2.3.4");
  });

  it("отвергает невалидный IP", () => {
    expect(() => ipToInt("256.0.0.0")).toThrow();
    expect(() => ipToInt("1.2.3")).toThrow();
    expect(() => ipToInt("hello")).toThrow();
  });
});

describe("cidrToRange / rangeToCidrs", () => {
  it("/24 даёт 256 адресов", () => {
    const r = cidrToRange("1.2.3.0/24");
    expect(r.start).toBe(ipToInt("1.2.3.0"));
    expect(r.end).toBe(ipToInt("1.2.3.255"));
  });

  it("/32 даёт один адрес", () => {
    const r = cidrToRange("1.2.3.4/32");
    expect(r.start).toBe(r.end);
    expect(r.start).toBe(ipToInt("1.2.3.4"));
  });

  it("/0 покрывает все пространство", () => {
    const r = cidrToRange("0.0.0.0/0");
    expect(r.start).toBe(0);
    expect(r.end).toBe(0xffffffff);
  });

  it("маскирует младшие биты", () => {
    const r = cidrToRange("1.2.3.99/24");
    expect(r.start).toBe(ipToInt("1.2.3.0"));
  });

  it("rangeToCidrs покрывает выровненный /24", () => {
    expect(
      rangeToCidrs(ipToInt("1.2.3.0"), ipToInt("1.2.3.255")),
    ).toStrictEqual(["1.2.3.0/24"]);
  });

  it("rangeToCidrs разбивает невыровненный диапазон", () => {
    const cidrs = rangeToCidrs(ipToInt("1.2.3.5"), ipToInt("1.2.3.10"));
    expect(cidrs).toStrictEqual([
      "1.2.3.5/32",
      "1.2.3.6/31",
      "1.2.3.8/31",
      "1.2.3.10/32",
    ]);
  });

  it("rangeToCidrs покрывает всё пространство /0", () => {
    expect(rangeToCidrs(0, 0xffffffff)).toStrictEqual(["0.0.0.0/0"]);
  });
});

describe("aggregate", () => {
  it("схлопывает два смежных /25 в /24", () => {
    expect(aggregate(["1.0.0.0/25", "1.0.0.128/25"])).toStrictEqual([
      "1.0.0.0/24",
    ]);
  });

  it("убирает перекрытие", () => {
    expect(aggregate(["1.0.0.0/24", "1.0.0.0/25"])).toStrictEqual([
      "1.0.0.0/24",
    ]);
  });

  it("не трогает несмежные диапазоны", () => {
    expect(aggregate(["1.0.0.0/24", "2.0.0.0/24"])).toStrictEqual([
      "1.0.0.0/24",
      "2.0.0.0/24",
    ]);
  });

  it("работает с пустым массивом", () => {
    expect(aggregate([])).toStrictEqual([]);
  });

  it("сортирует результат по IP", () => {
    expect(aggregate(["3.0.0.0/24", "1.0.0.0/24", "2.0.0.0/24"])).toStrictEqual(
      ["1.0.0.0/24", "2.0.0.0/24", "3.0.0.0/24"],
    );
  });

  it("дедуплицирует одинаковые CIDR", () => {
    expect(aggregate(["1.0.0.0/24", "1.0.0.0/24"])).toStrictEqual([
      "1.0.0.0/24",
    ]);
  });

  it("схлопывает четыре смежных /26 в /24", () => {
    expect(
      aggregate(["1.0.0.0/26", "1.0.0.64/26", "1.0.0.128/26", "1.0.0.192/26"]),
    ).toStrictEqual(["1.0.0.0/24"]);
  });
});

describe("subtract", () => {
  it("убирает первый /25 из /24, оставляет второй", () => {
    expect(subtract(["1.0.0.0/24"], ["1.0.0.0/25"])).toStrictEqual([
      "1.0.0.128/25",
    ]);
  });

  it("убирает /26 из середины /24 — разбивает на два куска", () => {
    expect(subtract(["1.0.0.0/24"], ["1.0.0.64/26"])).toStrictEqual([
      "1.0.0.0/26",
      "1.0.0.128/25",
    ]);
  });

  it("нет пересечения — возвращает from без изменений", () => {
    expect(subtract(["1.0.0.0/24"], ["2.0.0.0/24"])).toStrictEqual([
      "1.0.0.0/24",
    ]);
  });

  it("полное перекрытие — пустой результат", () => {
    expect(subtract(["1.0.0.0/24"], ["1.0.0.0/24"])).toStrictEqual([]);
  });

  it("вычитание из пустого — пустой результат", () => {
    expect(subtract([], ["1.0.0.0/24"])).toStrictEqual([]);
  });

  it("пустой remove — возвращает агрегированный from", () => {
    expect(subtract(["1.0.0.0/25", "1.0.0.128/25"], [])).toStrictEqual([
      "1.0.0.0/24",
    ]);
  });

  it("убирает /32 из середины /24", () => {
    const result = subtract(["1.0.0.0/24"], ["1.0.0.5/32"]);
    expect(contains(result, "1.0.0.5")).toBeNull();
    expect(contains(result, "1.0.0.4")).not.toBeNull();
    expect(contains(result, "1.0.0.6")).not.toBeNull();
  });
});

describe("contains", () => {
  it("находит IP в matching CIDR", () => {
    expect(contains(["10.0.0.0/8"], "10.5.5.5")).toBe("10.0.0.0/8");
  });

  it("возвращает null если не найден", () => {
    expect(contains(["10.0.0.0/8"], "11.0.0.1")).toBeNull();
  });

  it("работает на границах диапазона", () => {
    expect(contains(["1.2.3.0/24"], "1.2.3.0")).toBe("1.2.3.0/24");
    expect(contains(["1.2.3.0/24"], "1.2.3.255")).toBe("1.2.3.0/24");
    expect(contains(["1.2.3.0/24"], "1.2.4.0")).toBeNull();
  });
});

describe("isValidCidr", () => {
  it("принимает валидные CIDR", () => {
    expect(isValidCidr("1.2.3.0/24")).toBe(true);
    expect(isValidCidr("0.0.0.0/0")).toBe(true);
    expect(isValidCidr("255.255.255.255/32")).toBe(true);
  });

  it("отвергает невалидные", () => {
    expect(isValidCidr("1.2.3.0/33")).toBe(false);
    expect(isValidCidr("256.0.0.0/24")).toBe(false);
    expect(isValidCidr("1.2.3.0")).toBe(false);
    expect(isValidCidr("hello")).toBe(false);
  });
});

describe("isPrivateCidr", () => {
  it("определяет приватные диапазоны", () => {
    expect(isPrivateCidr("10.0.0.0/8")).toBe(true);
    expect(isPrivateCidr("192.168.1.0/24")).toBe(true);
    expect(isPrivateCidr("172.16.0.0/12")).toBe(true);
    expect(isPrivateCidr("127.0.0.1/32")).toBe(true);
  });

  it("публичные диапазоны - false", () => {
    expect(isPrivateCidr("8.8.8.0/24")).toBe(false);
    expect(isPrivateCidr("1.2.3.0/24")).toBe(false);
  });
});
