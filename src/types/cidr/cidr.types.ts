import { IpFamily } from "@/types/shared";

export interface ICidr {
  // Семейство адресов
  family: IpFamily;
  // Первый адрес
  start: bigint;
  // Последний адрес
  end: bigint;
  // Длина префикса
  prefix: number;
}

export interface IRange {
  family: IpFamily;
  start: bigint;
  end: bigint;
}
