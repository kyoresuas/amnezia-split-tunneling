import { Tier, TierId } from "@/types/shared";
import type { DnsService } from "@/services/dns";
import type { RipeService } from "@/services/ripe";
import type { GuardService } from "@/services/guard";
import type { ZonesService } from "@/services/zones";
import { IExcludeEntry, IServiceCategory } from "@/types/config";

export interface IZone {
  // Название зоны
  name: string;
  // Подсети IPv4
  ipv4: string[];
  // Подсети IPv6
  ipv6: string[];
}

export interface IRouteSelection {
  // Выбранная подсеть
  cidr: string;
  // Подсеть взята из анонса собственного ASN сервиса
  ownPrefix: boolean;
}

export interface IServiceRoutes {
  // Название сервиса
  name: string;
  // Категория сервиса
  category: string;
  // Минимальный уровень
  tier: Tier;
  // Подсети IPv4 сервиса
  ipv4: string[];
  // Подсети IPv6 сервиса
  ipv6: string[];
  // Домены сервиса
  domains: string[];
  // Адреса каждого домена
  domainIps: Map<string, string[]>;
}

export interface ITierData {
  // Уровень
  tier: Tier;
  // Идентификатор в именах файлов
  id: TierId;
  // Агрегированные подсети IPv4
  ipv4: string[];
  // Агрегированные подсети IPv6
  ipv6: string[];
  // Домены уровня
  domains: string[];
  // Адреса каждого домена
  domainIps: Map<string, string[]>;
  // Число сервисов уровня
  services: number;
  // Число категорий уровня
  categories: number;
}

export interface IGuardResult {
  // Число вычтенных подсетей IPv4
  subtracted4: number;
  // Число вычтенных подсетей IPv6
  subtracted6: number;
}

export interface IBuildResult {
  tiers: Record<Tier, ITierData>;
  guard: IGuardResult;
}

export interface IBuildDeps {
  // Резолвер доменов
  dns: DnsService;
  // Клиент RIPE Stat
  ripe: RipeService;
  // Чужие сети, которые вычитаются
  guard: GuardService;
  // Зона страны
  zones: ZonesService;
  // Подсети, которые обязаны идти через VPN
  exclude: IExcludeEntry[];
  // Категории сервисов
  categories: IServiceCategory[];
}
