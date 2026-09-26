import { Tier } from "@/types/shared";

export interface ICheckResult {
  ip: string;
  // Подсеть, содержащая адрес, по уровням
  tiers: Record<Tier, string | null>;
  // Префикс и владелец по данным RIPE
  prefix: string | null;
  asn: number | null;
  holder: string | null;
}
