import {
  MANIFEST_FILE,
  CHECKSUMS_FILE,
  FormatsContract,
} from "@/contracts/formats";
import { resolve } from "node:path";
import { Tier } from "@/types/shared";
import { fetchText } from "@/helpers/http";
import { parseLines } from "@/utils/files";
import { appLogger } from "@/config/logger";
import { IBuildResult } from "@/types/build";
import appConfig from "@/constants/appConfig";
import { formatNumber } from "@/utils/primitive";
import { IServiceCategory } from "@/types/config";
import { IWrittenFiles } from "@/services/formats";
import { writeFile, writeJson } from "@/utils/files";
import { RepositoryContract } from "@/contracts/repository";
import { TIER_ORDER, TiersContract } from "@/contracts/tiers";
import { IManifest, IManifestDiff, IManifestTier } from "@/types/manifest";

// Имя файла со сводкой по сервисам
const SERVICES_FILE = "services.json";

// Имя файла с заметками к релизу
const RELEASE_NOTES_FILE = "RELEASE_NOTES.md";

// Сколько примеров изменений хранить в манифесте
const SAMPLE_SIZE = 20;

/**
 * Манифест, контрольные суммы, сводка по сервисам и заметки к релизу
 */
export class ManifestService {
  constructor(private readonly dir: string = appConfig.DIST_DIR) {}

  /**
   * Подсети IPv4 уровня из прошлого релиза или null
   */
  private async loadPrevious(tier: Tier): Promise<string[] | null> {
    if (appConfig.OFFLINE) return null;

    const file = `${TiersContract[tier].id}.ipv4.txt`;

    try {
      return parseLines(
        await fetchText(RepositoryContract.rawUrl(file), {
          retries: 2,
          quiet: true,
        }),
      );
    } catch {
      return null;
    }
  }

  /**
   * Сравнить текущий список с прошлым
   */
  private diff(current: string[], previous: string[] | null): IManifestDiff {
    if (!previous)
      return { added: 0, removed: 0, addedSample: [], removedSample: [] };

    const before = new Set(previous);
    const after = new Set(current);
    const added = current.filter((cidr) => !before.has(cidr));
    const removed = previous.filter((cidr) => !after.has(cidr));

    return {
      added: added.length,
      removed: removed.length,
      addedSample: added.slice(0, SAMPLE_SIZE),
      removedSample: removed.slice(0, SAMPLE_SIZE),
    };
  }

  /**
   * Собрать и записать манифест
   */
  async create(
    build: IBuildResult,
    files: IWrittenFiles,
    categories: IServiceCategory[],
    generatedAt: string,
  ): Promise<IManifest> {
    const tiers = {} as IManifest["tiers"];

    for (const tier of TIER_ORDER) {
      const data = build.tiers[tier];
      const contract = TiersContract[tier];
      const previous = await this.loadPrevious(tier);
      const entry: IManifestTier = {
        id: contract.id,
        title: contract.title,
        description: contract.description,
        limit: contract.limit,
        ipv4: data.ipv4.length,
        ipv6: data.ipv6.length,
        domains: data.domains.length,
        services: data.services,
        categories: data.categories,
        diff: this.diff(data.ipv4, previous),
        files: files.tiers[tier],
      };

      tiers[contract.id] = entry;

      if (previous) {
        appLogger.info(
          `${contract.id}: +${entry.diff.added} / -${entry.diff.removed} относительно прошлого релиза`,
        );
      }
    }

    const manifest: IManifest = {
      schema: 1,
      generatedAt,
      repository: RepositoryContract.URL,
      tiers,
      shared: files.shared,
      formats: FormatsContract.map((f) => ({
        id: f.id,
        group: f.group,
        title: f.title,
        description: f.description,
        ipv6: f.ipv6,
        domains: f.domains,
        shared: f.shared,
      })),
      guard: build.guard,
    };

    writeJson(resolve(this.dir, MANIFEST_FILE), manifest);
    this.writeChecksums(manifest);
    this.writeServices(build, categories);
    writeFile(
      resolve(this.dir, "..", RELEASE_NOTES_FILE),
      this.renderReleaseNotes(manifest),
    );

    appLogger.ok(
      `Манифест записан: ${MANIFEST_FILE}, ${CHECKSUMS_FILE}, ${SERVICES_FILE}`,
    );

    return manifest;
  }

  /**
   * Файл контрольных сумм в формате sha256sum
   */
  private writeChecksums(manifest: IManifest): void {
    const lines = [
      ...Object.values(manifest.tiers).flatMap((t) => t.files),
      ...manifest.shared,
    ]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => `${f.sha256}  ${f.name}`);

    writeFile(resolve(this.dir, CHECKSUMS_FILE), lines.join("\n") + "\n");
  }

  /**
   * Сводка по сервисам для сайта и README
   */
  private writeServices(
    build: IBuildResult,
    categories: IServiceCategory[],
  ): void {
    const summary = categories.map((category) => ({
      id: category.id,
      title: category.title,
      description: category.description,
      services: category.services.map((service) => ({
        name: service.name,
        tier: service.tier,
        domains: service.domains.length,
        asns: (service.asns ?? []).map((a) => a.asn),
        apps: (service.apps ?? []).map((a) => a.package),
      })),
    }));

    writeJson(resolve(this.dir, SERVICES_FILE), {
      generatedAt: build ? new Date().toISOString() : "",
      categories: summary,
    });
  }

  /**
   * Заметки к релизу в Markdown
   */
  renderReleaseNotes(manifest: IManifest): string {
    const date = manifest.generatedAt.slice(0, 10);
    const rows = Object.values(manifest.tiers).map(
      (t) =>
        `| ${t.id} | ${formatNumber(t.ipv4)} | ${formatNumber(t.ipv6)} | ${formatNumber(t.domains)} | +${t.diff.added} / -${t.diff.removed} |`,
    );

    return [
      `Автоматическое обновление списков от ${date}.`,
      "",
      "| Уровень | IPv4 | IPv6 | Домены | Изменения |",
      "| --- | ---: | ---: | ---: | --- |",
      ...rows,
      "",
      `Все форматы, инструкции и проверка адреса: ${RepositoryContract.SITE_URL}`,
      "",
      `Контрольные суммы в \`${CHECKSUMS_FILE}\`, описание файлов в \`${MANIFEST_FILE}\`.`,
      "",
    ].join("\n");
  }
}
