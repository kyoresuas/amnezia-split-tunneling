import { Tier } from "@/types/shared";
import { ITierContract } from "@/types/tiers";

/**
 * Уровни списков в порядке возрастания
 */
export const TiersContract: Record<Tier, ITierContract> = {
  [Tier.LITE]: {
    id: "ru-lite",
    title: "Lite",
    description:
      "Банки, платежи, госуслуги и российские соцсети. Не более 500 подсетей, подходит любому клиенту",
    limit: 500,
  },
  [Tier.STANDARD]: {
    id: "ru-standard",
    title: "Standard",
    description:
      "Lite плюс маркетплейсы, Яндекс, Авито, 2ГИС, операторы, стриминги, доставка и ритейл. Не более 2000 подсетей",
    limit: 2000,
  },
  [Tier.FULL]: {
    id: "ru-full",
    title: "Full",
    description:
      "Standard плюс вся российская зона по данным ipdeny. Тысячи подсетей, только для клиентов, которые стабильно держат большие таблицы маршрутов",
    limit: null,
  },
} as const;

/**
 * Порядок уровней от компактного к полному
 */
export const TIER_ORDER: readonly Tier[] = [
  Tier.LITE,
  Tier.STANDARD,
  Tier.FULL,
] as const;
