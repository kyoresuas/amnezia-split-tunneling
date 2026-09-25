import {
  rmSync,
  statSync,
  existsSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { sha256 } from "@/utils/hash";
import { Tier } from "@/types/shared";
import { appLogger } from "@/config/logger";
import { IBuildResult } from "@/types/build";
import appConfig from "@/constants/appConfig";
import { TIER_ORDER } from "@/contracts/tiers";
import { ToolsService } from "@/services/tools";
import { IManifestFile } from "@/types/manifest";
import { ensureDir, writeFile } from "@/utils/files";
import { FormatsContract } from "@/contracts/formats";
import { FORMAT_WRITERS } from "@/services/formats/writers";
import { IFormat, FormatId, IFormatInput } from "@/types/formats";
import { buildGeoip, buildGeosite } from "@/services/formats/geodata";

export interface IWrittenFiles {
  // Файлы по уровням
  tiers: Record<Tier, IManifestFile[]>;
  // Общие файлы
  shared: IManifestFile[];
}

/**
 * Запись всех форматов в каталог dist
 */
export class FormatsService {
  constructor(
    private readonly tools: ToolsService,
    private readonly dir: string = appConfig.DIST_DIR,
  ) {}

  /**
   * Описание записанного файла для манифеста
   */
  private describe(
    format: IFormat,
    name: string,
    content: Buffer | string,
  ): IManifestFile {
    const buffer =
      typeof content === "string" ? Buffer.from(content, "utf8") : content;

    return {
      name,
      format: format.id,
      group: format.group,
      size: buffer.length,
      sha256: sha256(buffer),
    };
  }

  /**
   * Описание файла, уже лежащего на диске
   */
  private describeOnDisk(format: IFormat, name: string): IManifestFile {
    return this.describe(format, name, readFileSync(resolve(this.dir, name)));
  }

  /**
   * Бинарный формат через внешний инструмент
   */
  private writeWithTool(
    format: IFormat,
    input: IFormatInput,
    name: string,
  ): IManifestFile | null {
    const output = resolve(this.dir, name);

    if (format.tool === "sing-box") {
      const source = resolve(this.dir, `${input.tier}.singbox.json`);

      if (!existsSync(source)) throw new Error(`Нет исходника для ${name}`);
      if (!this.tools.compileSrs(source, output)) return null;
    }

    if (format.tool === "mihomo") {
      const source = resolve(this.dir, `.${input.tier}.mrs-source.txt`);

      writeFile(source, [...input.ipv4, ...input.ipv6].join("\n") + "\n");

      try {
        if (!this.tools.convertMrs(source, output)) return null;
      } finally {
        unlinkSync(source);
      }
    }

    return this.describeOnDisk(format, name);
  }

  /**
   * Записать все файлы и вернуть их описания
   */
  write(build: IBuildResult, generatedAt: string): IWrittenFiles {
    if (existsSync(this.dir))
      rmSync(this.dir, { recursive: true, force: true });

    ensureDir(this.dir);

    const result: IWrittenFiles = {
      tiers: { [Tier.LITE]: [], [Tier.STANDARD]: [], [Tier.FULL]: [] },
      shared: [],
    };
    const skipped = new Set<FormatId>();

    for (const tier of TIER_ORDER) {
      const data = build.tiers[tier];
      const input: IFormatInput = {
        tier: data.id,
        title: data.id,
        ipv4: data.ipv4,
        ipv6: data.ipv6,
        domains: data.domains,
        domainIps: data.domainIps,
        generatedAt,
      };

      // Сначала текстовые форматы: бинарные собираются из них
      for (const format of FormatsContract) {
        if (format.shared || format.tool) continue;

        const name = format.file(data.id);
        const writer = FORMAT_WRITERS[format.id];

        if (!writer) throw new Error(`Нет генератора для формата ${format.id}`);

        const output = writer(input, name);

        writeFile(resolve(this.dir, output.name), output.content);
        result.tiers[tier].push(
          this.describe(format, output.name, output.content),
        );
      }

      for (const format of FormatsContract) {
        if (format.shared || !format.tool) continue;

        const name = format.file(data.id);
        const described = this.writeWithTool(format, input, name);

        if (described) result.tiers[tier].push(described);
        else skipped.add(format.id);
      }

      // Порядок файлов в манифесте как в реестре форматов
      const order = new Map(FormatsContract.map((f, i) => [f.id, i]));

      result.tiers[tier].sort(
        (a, b) => (order.get(a.format) ?? 0) - (order.get(b.format) ?? 0),
      );
    }

    const tiers = TIER_ORDER.map((tier) => build.tiers[tier]);

    for (const format of FormatsContract) {
      if (!format.shared) continue;

      const name = format.file("ru-full");
      const content =
        format.id === FormatId.GEOIP ? buildGeoip(tiers) : buildGeosite(tiers);

      writeFile(resolve(this.dir, name), content);
      result.shared.push(this.describe(format, name, content));
    }

    for (const id of skipped) {
      appLogger.warn(
        `Формат ${id} пропущен: нет бинарника ${FormatsContract.find((f) => f.id === id)?.tool}`,
      );
    }

    const total =
      Object.values(result.tiers).flat().length + result.shared.length;
    const bytes = Object.values(result.tiers)
      .flat()
      .concat(result.shared)
      .reduce((sum, f) => sum + f.size, 0);

    appLogger.ok(
      `Записано файлов: ${total}, ${(bytes / 1024 / 1024).toFixed(1)} МБ`,
    );

    return result;
  }

  /**
   * Размер каталога dist в байтах
   */
  size(): number {
    if (!existsSync(this.dir)) return 0;

    return statSync(this.dir).size;
  }
}
