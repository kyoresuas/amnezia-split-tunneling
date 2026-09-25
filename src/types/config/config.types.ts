import { Tier } from "@/types/shared";

/**
 * Уровень, в который сервис попадает как минимум
 */
export type ServiceTier = Tier.LITE | Tier.STANDARD;

export interface IServiceAsn {
  // Номер автономной системы
  asn: number;
  // Человекочитаемое имя
  name: string;
  // Подстрока, которая обязана встречаться в holder по данным RIPE
  holder: string;
}

export interface IServiceApp {
  // Имя пакета Android-приложения
  package: string;
  // Версия, из которой снимались домены
  version: string;
  // Дата аудита в формате YYYY-MM-DD
  auditedAt: string;
}

export interface IServiceCidr {
  // Подсеть
  cidr: string;
  // Почему подсеть добавлена вручную
  reason: string;
}

export interface IService {
  // Название сервиса
  name: string;
  // Минимальный уровень списка
  tier: ServiceTier;
  // Домены, которые резолвятся в IP
  domains: string[];
  // Собственные автономные системы сервиса
  asns?: IServiceAsn[];
  // Подсети, добавленные вручную
  cidrs?: IServiceCidr[];
  // Приложения, из которых снимались домены
  apps?: IServiceApp[];
  // Заметка для людей
  notes?: string;
}

export interface IServiceCategory {
  // Идентификатор категории, совпадает с именем файла
  id: string;
  // Название категории
  title: string;
  // Описание категории
  description: string;
  // Сервисы категории
  services: IService[];
}

export interface IGuardSource {
  // Название источника
  name: string;
  // URL со списком подсетей
  url: string;
  // Формат ответа
  format: "text" | "cloudflare" | "fastly" | "aws" | "google";
  // Фильтр по сервису для AWS
  awsServices?: string[];
}

export interface IGuardConfig {
  // Внешние списки анycast и CDN, которых не должно быть в результатах
  sources: IGuardSource[];
  // Статические подсети, которых не должно быть в результатах
  cidrs: string[];
  // Автономные системы, которые запрещено указывать в сервисах
  forbiddenAsns: Array<{ asn: number; name: string }>;
}

export interface IExcludeEntry {
  // Подсеть, которая обязана идти через VPN
  cidr: string;
  // Комментарий из файла
  comment: string;
}
