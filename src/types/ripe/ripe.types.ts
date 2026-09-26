export interface IRipeResponse<T> {
  data?: T;
  status?: string;
}

export interface IRipeAsOverview {
  holder?: string;
  announced?: boolean;
}

export interface IRipeAnnouncedPrefixes {
  prefixes?: Array<{ prefix?: string }>;
}

export interface IRipeNetworkInfo {
  prefix?: string;
  asns?: Array<number | string>;
}

export interface IRipeCountryResources {
  resources?: { ipv4?: string[]; ipv6?: string[]; asn?: string[] };
}

export interface IRipeWhois {
  records?: Array<Array<{ key?: string; value?: string }>>;
}

export interface ICountryResources {
  ipv4: string[];
  ipv6: string[];
}
