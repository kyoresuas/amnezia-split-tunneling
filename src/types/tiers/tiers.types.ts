import { TierId } from "@/types/shared";

export interface ITierContract {
  // Идентификатор в именах файлов
  id: TierId;
  // Название для людей
  title: string;
  // Описание для README и сайта
  description: string;
  // Жёсткий лимит подсетей IPv4, null для полного списка
  limit: number | null;
}
