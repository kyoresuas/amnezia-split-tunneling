# RU Direct

Готовые списки российских подсетей и доменов для раздельного туннелирования. Банки, Госуслуги, Ozon, Wildberries, Яндекс и VK работают напрямую, весь остальной трафик идёт через VPN. Три уровня, 27 форматов для AmneziaVPN, WireGuard, sing-box, Xray, Clash, MikroTik, Keenetic и OpenWrt. Обновляется каждый день.

[![Списки](https://github.com/kyoresuas/amnezia-split-tunneling/actions/workflows/update.yml/badge.svg)](https://github.com/kyoresuas/amnezia-split-tunneling/actions/workflows/update.yml)
[![CI](https://github.com/kyoresuas/amnezia-split-tunneling/actions/workflows/ci.yml/badge.svg)](https://github.com/kyoresuas/amnezia-split-tunneling/actions/workflows/ci.yml)
[![Lite](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkyoresuas%2Famnezia-split-tunneling%2Frelease%2Fmanifest.json&query=%24.tiers%5B%27ru-lite%27%5D.ipv4&label=ru-lite&suffix=%20CIDR&color=0f766e)](https://kyoresuas.github.io/amnezia-split-tunneling/)
[![Standard](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkyoresuas%2Famnezia-split-tunneling%2Frelease%2Fmanifest.json&query=%24.tiers%5B%27ru-standard%27%5D.ipv4&label=ru-standard&suffix=%20CIDR&color=0f766e)](https://kyoresuas.github.io/amnezia-split-tunneling/)
[![Full](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkyoresuas%2Famnezia-split-tunneling%2Frelease%2Fmanifest.json&query=%24.tiers%5B%27ru-full%27%5D.ipv4&label=ru-full&suffix=%20CIDR&color=0f766e)](https://kyoresuas.github.io/amnezia-split-tunneling/)
[![Скачивания](https://img.shields.io/github/downloads/kyoresuas/amnezia-split-tunneling/total?label=%D1%81%D0%BA%D0%B0%D1%87%D0%B8%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9&color=lightgrey)](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)

**Русский** · [English](README_EN.md)

## Скачать

**[Страница скачивания](https://kyoresuas.github.io/amnezia-split-tunneling/)**: выбираете клиент и уровень, получаете кнопку, ссылку для подписки и инструкцию. Там же проверка, входит ли адрес в список.

Если нужен файл для AmneziaVPN прямо сейчас:

| Уровень | Что внутри | Файл |
| --- | --- | --- |
| **ru-lite** | Банки, Мир и СБП, Госуслуги, ФНС, ведомства, VK, ОК, Mail.ru, MAX, Дзен, Rutube. До 500 подсетей, подходит любому клиенту. **Рекомендуется** | [ru-lite.amnezia.json](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-lite.amnezia.json) |
| **ru-standard** | Lite плюс Ozon, Wildberries, Яндекс, Авито, 2ГИС, операторы, стриминги, доставка, ритейл, путешествия. До 2000 подсетей | [ru-standard.amnezia.json](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-standard.amnezia.json) |
| **ru-full** | Standard плюс вся российская зона по данным RIPE. Тысячи подсетей, только для роутеров и десктопов | [ru-full.amnezia.json](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-full.amnezia.json) |

Все форматы лежат в [последнем релизе](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest). Имена файлов одинаковые во всех источниках:

```text
https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/<файл>
https://cdn.jsdelivr.net/gh/kyoresuas/amnezia-split-tunneling@release/<файл>
https://raw.githubusercontent.com/kyoresuas/amnezia-split-tunneling/release/<файл>
```

Первая ссылка без кэша, вторая через CDN для подписок в клиентах, третья с задержкой до пяти минут. Контрольные суммы в `SHA256SUMS`, описание всех файлов в `manifest.json`.

### Форматы

| Клиент | Файлы |
| --- | --- |
| AmneziaVPN | `<уровень>.amnezia.json`, `<уровень>.amnezia-domains.json` |
| AmneziaWG, WireGuard | `<уровень>.wireguard.txt`, `<уровень>.wireguard-inverted.txt` |
| sing-box, Hiddify, NekoBox, Karing, Throne, Podkop | `<уровень>.singbox.srs`, `<уровень>.singbox.json` |
| Xray, v2rayN, v2rayNG, Happ, Streisand | `geoip.dat`, `geosite.dat`, `<уровень>.v2rayn.json`, `<уровень>.happ.json` |
| Clash, Mihomo, Clash Verge, FlClash | `<уровень>.mihomo.mrs`, `<уровень>.mihomo.yaml`, `<уровень>.clash.yaml` |
| Shadowrocket, Surge, Loon | `<уровень>.surge.list` |
| Quantumult X | `<уровень>.quantumultx.list` |
| MikroTik | `<уровень>.mikrotik.rsc`, `<уровень>.mikrotik-ipv6.rsc` |
| Keenetic | `<уровень>.keenetic.bat`, `<уровень>.keenetic-cli.txt` |
| OpenWrt | `<уровень>.openwrt.nft`, `<уровень>.dnsmasq.conf` |
| Windows, Linux, macOS | `<уровень>.windows.bat`, `<уровень>.linux.sh`, `<уровень>.macos.sh` |
| Просто списки | `<уровень>.ipv4.txt`, `<уровень>.ipv6.txt`, `<уровень>.domains.txt` |

Уровень это `ru-lite`, `ru-standard` или `ru-full`. В `geoip.dat` и `geosite.dat` все три уровня лежат тегами `geoip:ru-lite`, `geosite:ru-standard` и так далее.

## Импорт в AmneziaVPN

1. Скачайте файл на устройство.
2. Откройте подключение, затем **Настройки подключения** и **Split Tunneling**.
3. Выберите **Site-based split tunneling** и режим **Адреса из списка не идут через VPN**.
4. Нажмите ⋮, затем **Import** и **Replace site list**, укажите файл.
5. Включите split tunneling и переподключитесь.

Проверка: откройте [yandex.ru/internet](https://yandex.ru/internet), должен показаться адрес вашего провайдера, а не VPN-сервера.

Файл `amnezia-domains.json` содержит ещё и домены с адресами. Десктопный клиент 5.x ре-резолвит их при каждом подключении, поэтому список самовосстанавливается при смене адресов у CDN. На телефоне разницы нет, берите обычный файл.

## Что список закрывает, а что нет

Список решает две задачи: сайт или API видит ваш домашний адрес, а трафик к российским сервисам не уходит в туннель. Это убирает серверную проверку по IP и экономит трафик VPN.

Список не может убрать проверку на самом устройстве. Приложения Ozon, Wildberries, Сбера, 2ГИС и других на Android смотрят на наличие tun-интерфейса и список установленных VPN-клиентов, а результат отправляют на сервер. Отсюда баннер «выключите VPN» даже с идеальным списком. Что помогает:

- VPN на роутере, а не на телефоне: устройство VPN не видит.
- Рабочий профиль Android, где маркетплейсы живут вне VPN.
- App-based split tunneling в AmneziaVPN на Android: исключите приложения из туннеля, список оставьте для браузера.
- На iOS app-based режима нет. Остаются список и отключённый IPv6.

Подробнее про механику: [исследование RKS Global](https://rks.global/ru/research/vpn-detection/).

## Вопросы

### Какой уровень выбрать?

Lite, если нужны банки, платежи, госуслуги и соцсети. Standard, если пользуетесь маркетплейсами, Яндексом, доставкой и стримингами. Full только для роутеров и десктопов: клиент должен держать тысячи маршрутов.

### AmneziaVPN на Windows долго подключается с большим списком

Известная проблема клиента: маршруты ставятся по одному, на тысячах записей это минуты. Обсуждение в [amnezia-client #2248](https://github.com/amnezia-vpn/amnezia-client/issues/2248), исправление в [PR #2516](https://github.com/amnezia-vpn/amnezia-client/pull/2516) пока не принято. Берите Lite или Standard.

### У меня IPv6, что делать?

AmneziaVPN понимает только IPv4, и IPv6-трафик к российским сайтам уйдёт в туннель. Либо отключите IPv6 на устройстве, либо используйте клиент с IPv6-списками: WireGuard, sing-box, Clash, MikroTik и OpenWrt получают их в тех же файлах.

### Сайт не открывается напрямую. Как добавить?

Проверьте адрес на [сайте](https://kyoresuas.github.io/amnezia-split-tunneling/#check) или локально:

```bash
npm run check -- ozon.ru
npm run check -- 185.73.193.68
```

Если адреса нет в списке, откройте [issue](https://github.com/kyoresuas/amnezia-split-tunneling/issues/new/choose) с доменом и IP или пришлите pull request в `config/services`.

### Почему в списке нет Cloudflare, AWS или Selectel целиком?

Потому что это чужие сети. Guard вычитает Cloudflare, AWS, Fastly, Google и другие anycast-сети из каждого уровня, а хостинги и anti-DDoS запрещены как источники сервисов. Иначе через список мимо VPN пошли бы чужие сайты, как это случилось у некоторых конкурентов.

## Как собирается

- **Полная зона**: подсети, зарегистрированные за Россией по данным [RIPE Stat](https://stat.ripe.net/), с фолбэком на ipdeny.
- **Сервисы**: собственные автономные системы каждого сервиса, подтверждённые через RIPE, плюс домены, снятые из приложений в [RuStore](https://www.rustore.ru/) и с сайтов. Пакеты и версии приложений записаны в конфиге.
- **Точность**: префикс целиком берётся только у собственной сети сервиса. Хосты на чужих сетях попадают точными адресами, и только если сеть российская.
- **Guard**: Cloudflare, AWS, Fastly, Google и статические anycast-подсети вычитаются из всех уровней; запрещённые ASN не пройдут проверку конфигурации.
- **Уровни**: Lite не больше 500 подсетей IPv4, Standard не больше 2000, сборка падает при превышении.
- **Форматы**: все файлы собираются из одних данных одним генератором на TypeScript, бинарные `.srs` и `.mrs` компилируются официальными sing-box и mihomo.

Состав каждого уровня в `services.json` рядом со списками. Полное описание архитектуры для разработчиков и агентов в [AGENTS.md](AGENTS.md).

## Добавить сервис

1. Найдите категорию в `config/services`, например `marketplaces.json`.
2. Добавьте сервис: имя, уровень `lite` или `standard`, домены, при наличии собственные ASN с подстрокой holder из RIPE и подсети с обоснованием.
3. Запустите `npm run verify`: проверит схему и holder каждого ASN.
4. Запустите `npm run update` и убедитесь, что уровни не превысили лимит.
5. Откройте pull request. Домены лучше снимать из реального трафика приложения, а не переписывать из чужих списков.

## Разработка

```bash
npm ci
npm run tools      # sing-box и mihomo для бинарных форматов
npm run update     # полная сборка в dist/
npm run generate   # сборка из кэша без сети
npm run verify     # проверка конфигурации и ASN
npm run check -- <ip|домен>
npm run lint
npm test
```

Node.js 20 и новее. CI прогоняет lint, тесты и проверку конфигурации на Node.js 20, 22 и 24. Сборка запускается каждый день, публикует rolling-релиз `latest`, ветку `release` и сайт.

## Поддержать проект

Если проект оказался полезен, вы можете поддержать его развитие:

- **Карта «Мир»:** `2200700644781816`
- **TON:** `kyoresuas.ton`
- **Адрес кошелька TON:** `UQATzyMcVoZudjaA5Rc9w5TV_lIqxh9DPk0gSnjkLVvwEVqz`
- **USDT в сети TRON (TRC-20):** `TJSLjDo4yRgHr9JqqEcrkbC51bP9DCiBC7`

Перед переводом криптовалюты убедитесь, что выбрана правильная сеть.

## Связаться

- [GitHub Issues](https://github.com/kyoresuas/amnezia-split-tunneling/issues)
- Telegram: [@stercuss](https://t.me/stercuss)
- Email: [hey@kyoresuas.com](mailto:hey@kyoresuas.com)

## Дисклеймер

Независимый проект. Не связан с Amnezia и другими упомянутыми клиентами, не спонсируется и не рекламирует VPN-сервисы.

## Лицензия

[MIT](LICENSE)
