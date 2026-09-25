# RU Direct

Ready-made lists of Russian networks and domains for VPN split tunneling. Banks, government services, Ozon, Wildberries, Yandex and VK go direct, everything else goes through the tunnel. Three tiers, 27 formats for AmneziaVPN, WireGuard, sing-box, Xray, Clash, MikroTik, Keenetic and OpenWrt. Rebuilt daily.

**English** · [Русский](README.md)

## Download

**[Download page](https://kyoresuas.github.io/amnezia-split-tunneling/)**: pick a client and a tier, get a button, a subscription URL and import steps. The page also checks whether an address is on a list.

For AmneziaVPN right away:

| Tier | Contents | File |
| --- | --- | --- |
| **ru-lite** | Banks, Mir and SBP payments, Gosuslugi, tax service, ministries, VK, OK, Mail.ru, MAX, Dzen, Rutube. Up to 500 prefixes, works in any client. **Recommended** | [ru-lite.amnezia.json](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-lite.amnezia.json) |
| **ru-standard** | Lite plus Ozon, Wildberries, Yandex, Avito, 2GIS, carriers, streaming, delivery, retail, travel. Up to 2000 prefixes | [ru-standard.amnezia.json](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-standard.amnezia.json) |
| **ru-full** | Standard plus the whole Russian address space from RIPE. Thousands of prefixes, routers and desktops only | [ru-full.amnezia.json](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-full.amnezia.json) |

Every format is attached to the [latest release](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest). File names are identical across all sources:

```text
https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/<file>
https://cdn.jsdelivr.net/gh/kyoresuas/amnezia-split-tunneling@release/<file>
https://raw.githubusercontent.com/kyoresuas/amnezia-split-tunneling/release/<file>
```

The first URL is never cached, the second is a CDN for client subscriptions, the third lags by up to five minutes. Checksums live in `SHA256SUMS`, every file is described in `manifest.json`.

### Formats

| Client | Files |
| --- | --- |
| AmneziaVPN | `<tier>.amnezia.json`, `<tier>.amnezia-domains.json` |
| AmneziaWG, WireGuard | `<tier>.wireguard.txt`, `<tier>.wireguard-inverted.txt` |
| sing-box, Hiddify, NekoBox, Karing, Throne, Podkop | `<tier>.singbox.srs`, `<tier>.singbox.json` |
| Xray, v2rayN, v2rayNG, Happ, Streisand | `geoip.dat`, `geosite.dat`, `<tier>.v2rayn.json`, `<tier>.happ.json` |
| Clash, Mihomo, Clash Verge, FlClash | `<tier>.mihomo.mrs`, `<tier>.mihomo.yaml`, `<tier>.clash.yaml` |
| Shadowrocket, Surge, Loon | `<tier>.surge.list` |
| Quantumult X | `<tier>.quantumultx.list` |
| MikroTik | `<tier>.mikrotik.rsc`, `<tier>.mikrotik-ipv6.rsc` |
| Keenetic | `<tier>.keenetic.bat`, `<tier>.keenetic-cli.txt` |
| OpenWrt | `<tier>.openwrt.nft`, `<tier>.dnsmasq.conf` |
| Windows, Linux, macOS | `<tier>.windows.bat`, `<tier>.linux.sh`, `<tier>.macos.sh` |
| Plain lists | `<tier>.ipv4.txt`, `<tier>.ipv6.txt`, `<tier>.domains.txt` |

Tier is `ru-lite`, `ru-standard` or `ru-full`. `geoip.dat` and `geosite.dat` carry all three tiers as tags such as `geoip:ru-lite` and `geosite:ru-standard`.

## Importing into AmneziaVPN

1. Download the file to the device.
2. Open the connection, then **Connection settings** and **Split Tunneling**.
3. Choose **Site-based split tunneling** and the mode **Addresses from the list should not be accessed via VPN**.
4. Tap ⋮, then **Import** and **Replace site list**, pick the file.
5. Enable split tunneling and reconnect.

The `amnezia-domains.json` variant also carries domains with their addresses. The desktop client 5.x re-resolves them on every connection, so the list heals itself when a CDN changes addresses. On phones there is no difference, use the plain file.

## What the list fixes and what it cannot

The list makes a site or an API see your home address and keeps Russian traffic out of the tunnel. That removes the server-side IP check and saves VPN bandwidth.

It cannot remove on-device checks. Android apps of Ozon, Wildberries, Sber, 2GIS and others look for a tun interface and installed VPN clients and report the result to their servers. That is why the "turn off your VPN" banner can appear even with a perfect list. What helps: VPN on the router, an Android work profile with marketplaces outside the VPN, or app-based split tunneling in AmneziaVPN on Android. iOS has no app-based mode, so the list and disabled IPv6 are all you get.

## FAQ

### Which tier should I pick?

Lite for banks, payments, government services and social networks. Standard if you use marketplaces, Yandex, delivery and streaming. Full only on routers and desktops that can hold thousands of routes.

### AmneziaVPN on Windows connects for minutes with a big list

A known client issue: routes are installed one by one. See [amnezia-client #2248](https://github.com/amnezia-vpn/amnezia-client/issues/2248). Use Lite or Standard.

### I have IPv6

AmneziaVPN is IPv4 only, so IPv6 traffic to Russian sites goes through the tunnel. Either disable IPv6 on the device or use a client with IPv6 lists: WireGuard, sing-box, Clash, MikroTik and OpenWrt get them in the same files.

### A site still goes through the VPN

Check the address on the [site](https://kyoresuas.github.io/amnezia-split-tunneling/#check) or locally with `npm run check -- example.ru`. If it is missing, open an [issue](https://github.com/kyoresuas/amnezia-split-tunneling/issues/new/choose) or send a pull request to `config/services`.

### Why are Cloudflare, AWS or hosting providers not included?

Because those are not Russian services. A guard subtracts Cloudflare, AWS, Fastly, Google and other anycast networks from every tier, and hosting or anti-DDoS ASNs are rejected by config validation. Otherwise foreign sites would leak past the VPN, which has happened to other lists.

## How it is built

- **Full zone**: prefixes registered to Russia according to [RIPE Stat](https://stat.ripe.net/), with ipdeny as a fallback.
- **Services**: each service's own autonomous systems verified through RIPE, plus domains extracted from [RuStore](https://www.rustore.ru/) apps and websites. App packages and versions are recorded in the config.
- **Precision**: a whole prefix is taken only from a service's own network. Hosts on foreign networks become exact addresses, and only when the network is Russian.
- **Guard**: Cloudflare, AWS, Fastly, Google and static anycast prefixes are subtracted from every tier.
- **Tiers**: Lite is capped at 500 IPv4 prefixes, Standard at 2000; the build fails otherwise.
- **Formats**: one TypeScript generator produces every file from the same data; `.srs` and `.mrs` are compiled by the official sing-box and mihomo binaries.

Architecture notes for contributors and agents are in [AGENTS.md](AGENTS.md).

## Development

```bash
npm ci
npm run tools      # sing-box and mihomo for binary formats
npm run update     # full build into dist/
npm run generate   # rebuild from cache, no network
npm run verify     # validate config and ASN holders
npm run check -- <ip|domain>
npm run lint
npm test
```

Node.js 20 or newer. CI runs lint, tests and config validation on Node.js 20, 22 and 24. A daily workflow publishes the rolling `latest` release, the `release` branch and the site.

## Support the project

- **Russian MIR card:** `2200700644781816`
- **TON:** `kyoresuas.ton`
- **TON wallet address:** `UQATzyMcVoZudjaA5Rc9w5TV_lIqxh9DPk0gSnjkLVvwEVqz`
- **USDT on TRON (TRC-20):** `TJSLjDo4yRgHr9JqqEcrkbC51bP9DCiBC7`

Please verify the network before transferring cryptocurrency.

## Contact

- [GitHub Issues](https://github.com/kyoresuas/amnezia-split-tunneling/issues)
- Telegram: [@stercuss](https://t.me/stercuss)
- Email: [hey@kyoresuas.com](mailto:hey@kyoresuas.com)

## Disclaimer

An independent project. Not affiliated with Amnezia or any other client mentioned, not sponsored, no VPN advertising.

## License

[MIT](LICENSE)
