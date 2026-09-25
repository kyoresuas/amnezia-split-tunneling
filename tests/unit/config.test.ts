import { join } from "node:path";
import { tmpdir } from "node:os";
import { Tier } from "@/types/shared";
import { ConfigService } from "@/services/config";
import { IServiceCategory } from "@/types/config";
import { rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { it, expect, describe, afterEach, beforeEach } from "vitest";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ru-direct-config-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Корректная категория для тестов
 */
const category = (): IServiceCategory => ({
  id: "banks",
  title: "Банки",
  description: "Описание",
  services: [
    {
      name: "Сбербанк",
      tier: Tier.LITE,
      domains: ["sberbank.ru", "online.sberbank.ru"],
      asns: [{ asn: 35237, name: "Сбербанк", holder: "Sberbank" }],
      cidrs: [{ cidr: "1.2.3.0/24", reason: "тест" }],
      apps: [
        { package: "ru.sberbankmobile", version: "1", auditedAt: "2026-09-25" },
      ],
    },
  ],
});

describe("ConfigService", () => {
  it("читает категории из каталога и берёт id из имени файла", () => {
    writeFileSync(
      join(dir, "banks.json"),
      JSON.stringify({ title: "Банки", description: "Описание", services: [] }),
    );

    const categories = new ConfigService(dir).loadCategories();

    expect(categories).toHaveLength(1);
    expect(categories[0]!.id).toBe("banks");
    expect(categories[0]!.title).toBe("Банки");
  });

  it("пропускает корректную конфигурацию", () => {
    expect(new ConfigService(dir).validate([category()])).toEqual([]);
  });

  it("ловит невалидные домены, ASN без holder и дубли", () => {
    const broken = category();

    broken.services[0]!.domains = [
      "Sberbank.ru",
      "плохой домен",
      "ok.ru",
      "ok.ru",
    ];
    broken.services[0]!.asns = [{ asn: 0, name: "", holder: "" }];
    broken.services[0]!.cidrs = [{ cidr: "999.1.1.1/24", reason: "" }];
    broken.services[0]!.apps = [
      { package: "", version: "1", auditedAt: "вчера" },
    ];

    const errors = new ConfigService(dir).validate([broken]);

    expect(errors.some((e) => e.includes("не в нижнем регистре"))).toBe(true);
    expect(errors.some((e) => e.includes("невалидный домен"))).toBe(true);
    expect(errors.some((e) => e.includes("дубль домена"))).toBe(true);
    expect(errors.some((e) => e.includes("невалидный ASN"))).toBe(true);
    expect(errors.some((e) => e.includes("невалидная подсеть"))).toBe(true);
    expect(errors.some((e) => e.includes("auditedAt"))).toBe(true);
  });

  it("запрещает один ASN у двух сервисов и пустой сервис", () => {
    const first = category();
    const second = category();

    second.services[0]!.name = "Другой";
    first.services.push({ name: "Пустой", tier: Tier.STANDARD, domains: [] });

    const errors = new ConfigService(dir).validate([first, second]);

    expect(errors.some((e) => e.includes("AS35237 указан и у"))).toBe(true);
    expect(errors.some((e) => e.includes("нет ни доменов"))).toBe(true);
  });

  it("принимает punycode-домены", () => {
    const cat = category();

    cat.services[0]!.domains = ["xn--b1aew.xn--p1ai"];

    expect(new ConfigService(dir).validate([cat])).toEqual([]);
  });
});
