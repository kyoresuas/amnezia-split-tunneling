import { Tier, TierId } from "@/types/shared";
import { FormatId, FormatGroup } from "@/types/formats";

export interface IManifestFile {
  // Имя файла в релизе
  name: string;
  // Идентификатор формата
  format: FormatId;
  // Группа клиентов
  group: FormatGroup;
  // Размер в байтах
  size: number;
  // Контрольная сумма
  sha256: string;
}

export interface IManifestDiff {
  // Число добавленных подсетей IPv4
  added: number;
  // Число удалённых подсетей IPv4
  removed: number;
  // Примеры добавленных подсетей
  addedSample: string[];
  // Примеры удалённых подсетей
  removedSample: string[];
}

export interface IManifestTier {
  id: TierId;
  // Название уровня
  title: string;
  // Описание уровня
  description: string;
  // Жёсткий лимит подсетей IPv4 или null
  limit: number | null;
  // Число подсетей IPv4
  ipv4: number;
  // Число подсетей IPv6
  ipv6: number;
  // Число доменов
  domains: number;
  // Число сервисов
  services: number;
  // Число категорий
  categories: number;
  // Изменения относительно прошлой сборки
  diff: IManifestDiff;
  // Файлы уровня
  files: IManifestFile[];
}

export interface IManifestFormat {
  id: FormatId;
  group: FormatGroup;
  title: string;
  description: string;
  ipv6: boolean;
  domains: boolean;
  shared: boolean;
}

export interface IManifest {
  // Версия схемы манифеста
  schema: 1;
  // Дата сборки
  generatedAt: string;
  // Репозиторий
  repository: string;
  // Уровни
  tiers: Record<TierId, IManifestTier>;
  // Общие файлы
  shared: IManifestFile[];
  // Описание форматов
  formats: IManifestFormat[];
  // Сколько чужих подсетей вычел guard
  guard: { subtracted4: number; subtracted6: number };
}

export interface IWrittenFiles {
  // Файлы по уровням
  tiers: Record<Tier, IManifestFile[]>;
  // Общие файлы
  shared: IManifestFile[];
}
