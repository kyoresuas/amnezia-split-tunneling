export interface IFastlyResponse {
  addresses?: string[];
  ipv6_addresses?: string[];
}

export interface IAwsResponse {
  prefixes?: Array<{ ip_prefix?: string; service?: string }>;
  ipv6_prefixes?: Array<{ ipv6_prefix?: string; service?: string }>;
}

export interface IGoogleResponse {
  prefixes?: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>;
}
