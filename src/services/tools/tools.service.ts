import { resolve } from "node:path";
import { ensureDir } from "@/utils/files";
import { appLogger } from "@/config/logger";
import appConfig from "@/constants/appConfig";
import { spawnSync } from "node:child_process";
import { SourcesContract } from "@/contracts/sources";
import { fetchJson, fetchBuffer } from "@/helpers/http";
import { chmodSync, existsSync, unlinkSync, writeFileSync } from "node:fs";

interface IGithubRelease {
  tag_name?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
}

export type ToolName = "sing-box" | "mihomo";

/**
 * Внешние бинарники для бинарных форматов: sing-box и mihomo
 */
export class ToolsService {
  constructor(private readonly dir: string = appConfig.TOOLS_DIR) {}

  /**
   * Архитектура в терминах релизов GitHub
   */
  private arch(): string {
    switch (process.arch) {
      case "x64":
        return "amd64";
      case "arm64":
        return "arm64";
      default:
        throw new Error(`Архитектура ${process.arch} не поддерживается`);
    }
  }

  /**
   * Путь к бинарнику: сначала каталог .tools, потом PATH
   */
  resolve(name: ToolName): string | null {
    const local = resolve(this.dir, name);

    if (existsSync(local)) return local;

    const which = spawnSync("which", [name], { encoding: "utf8" });

    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();

    return null;
  }

  /**
   * Заголовки для GitHub API с токеном, если он есть в окружении
   */
  private githubHeaders(): Record<string, string> {
    const token = process.env.GITHUB_TOKEN;

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Найти ссылку на ассет последнего релиза по регулярному выражению
   */
  private async findAsset(repo: string, pattern: RegExp): Promise<string> {
    const release = await fetchJson<IGithubRelease>(
      `https://api.github.com/repos/${repo}/releases/latest`,
      { headers: this.githubHeaders() },
    );
    const asset = (release.assets ?? []).find((a) =>
      pattern.test(a.name ?? ""),
    );

    if (!asset?.browser_download_url) {
      throw new Error(
        `В релизе ${repo} ${release.tag_name ?? ""} нет ассета ${pattern}`,
      );
    }

    return asset.browser_download_url;
  }

  /**
   * Скачать sing-box: tar.gz с бинарником внутри каталога
   */
  private async installSingbox(): Promise<void> {
    const platform = process.platform;
    const url = await this.findAsset(
      SourcesContract.TOOLS.SINGBOX.repo,
      new RegExp(`^sing-box-[\\d.]+-${platform}-${this.arch()}\\.tar\\.gz$`),
    );
    const archive = resolve(this.dir, "sing-box.tar.gz");

    writeFileSync(archive, await fetchBuffer(url));

    const tar = spawnSync(
      "tar",
      [
        "-xzf",
        archive,
        "-C",
        this.dir,
        "--strip-components=1",
        "--wildcards",
        "*/sing-box",
      ],
      { encoding: "utf8" },
    );

    if (tar.status !== 0) {
      // macOS tar не знает --wildcards, распаковываем целиком
      const plain = spawnSync(
        "tar",
        ["-xzf", archive, "-C", this.dir, "--strip-components=1"],
        {
          encoding: "utf8",
        },
      );

      if (plain.status !== 0) throw new Error(`tar: ${plain.stderr}`);
    }

    unlinkSync(archive);
    chmodSync(resolve(this.dir, "sing-box"), 0o755);
  }

  /**
   * Скачать mihomo: gzip с одним бинарником
   */
  private async installMihomo(): Promise<void> {
    const platform = process.platform;
    const url = await this.findAsset(
      SourcesContract.TOOLS.MIHOMO.repo,
      new RegExp(`^mihomo-${platform}-${this.arch()}-v[\\d.]+\\.gz$`),
    );
    const archive = resolve(this.dir, "mihomo.gz");

    writeFileSync(archive, await fetchBuffer(url));

    const gunzip = spawnSync("gunzip", ["-f", archive], { encoding: "utf8" });

    if (gunzip.status !== 0) throw new Error(`gunzip: ${gunzip.stderr}`);

    chmodSync(resolve(this.dir, "mihomo"), 0o755);
  }

  /**
   * Установить недостающие бинарники в каталог .tools
   */
  async install(): Promise<void> {
    ensureDir(this.dir);

    if (!this.resolve("sing-box")) {
      appLogger.info("Скачиваю sing-box…");
      await this.installSingbox();
      appLogger.ok(`sing-box: ${this.version("sing-box")}`);
    } else {
      appLogger.verbose(`sing-box уже есть: ${this.version("sing-box")}`);
    }

    if (!this.resolve("mihomo")) {
      appLogger.info("Скачиваю mihomo…");
      await this.installMihomo();
      appLogger.ok(`mihomo: ${this.version("mihomo")}`);
    } else {
      appLogger.verbose(`mihomo уже есть: ${this.version("mihomo")}`);
    }
  }

  /**
   * Версия бинарника
   */
  version(name: ToolName): string {
    const binary = this.resolve(name);

    if (!binary) return "не установлен";

    const result = spawnSync(
      binary,
      name === "sing-box" ? ["version"] : ["-v"],
      {
        encoding: "utf8",
      },
    );

    return (result.stdout || result.stderr).split("\n")[0]?.trim() || "?";
  }

  /**
   * Скомпилировать rule-set sing-box из исходного JSON
   */
  compileSrs(sourcePath: string, outputPath: string): boolean {
    const binary = this.resolve("sing-box");

    if (!binary) return false;

    const result = spawnSync(
      binary,
      ["rule-set", "compile", "--output", outputPath, sourcePath],
      {
        encoding: "utf8",
      },
    );

    if (result.status !== 0)
      throw new Error(`sing-box: ${result.stderr || result.stdout}`);

    return true;
  }

  /**
   * Собрать бинарный rule-provider mihomo из текстового списка подсетей
   */
  convertMrs(sourcePath: string, outputPath: string): boolean {
    const binary = this.resolve("mihomo");

    if (!binary) return false;

    const result = spawnSync(
      binary,
      ["convert-ruleset", "ipcidr", "text", sourcePath, outputPath],
      {
        encoding: "utf8",
      },
    );

    if (result.status !== 0)
      throw new Error(`mihomo: ${result.stderr || result.stdout}`);

    return true;
  }
}
