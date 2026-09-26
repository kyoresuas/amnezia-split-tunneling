export interface IUpdateOptions {
  // Не ходить в сеть, собирать из кэша
  offline: boolean;
  // Не проверять ASN через RIPE
  skipAsnCheck: boolean;
}
