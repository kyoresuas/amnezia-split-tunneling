export interface INetworkInfo {
  // Префикс, в который входит адрес
  prefix: string | null;
  // Автономные системы, анонсирующие префикс
  asns: number[];
}

export interface IAsnOverview {
  asn: number;
  // Название владельца по данным RIPE
  holder: string;
  // Анонсируется ли ASN сейчас
  announced: boolean;
}

export interface IAnnouncedPrefixes {
  asn: number;
  ipv4: string[];
  ipv6: string[];
}

export interface IResolvedDomain {
  domain: string;
  ipv4: string[];
  ipv6: string[];
}

export interface IDohProvider {
  name: string;
  url: string;
  headers: Record<string, string>;
}
