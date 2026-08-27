# Amnezia Split Tunneling

Готовые списки российских IPv4-адресов для раздельного туннелирования в [AmneziaVPN](https://amnezia.org). После импорта выбранные российские сервисы работают напрямую, а остальной трафик идёт через VPN.

[![Release](https://img.shields.io/github/v/release/kyoresuas/amnezia-split-tunneling?sort=semver&label=release&color=success)](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest)
[![Essential CIDR](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkyoresuas%2Famnezia-split-tunneling%2Fmain%2Flists%2Fessential-stats.json&query=%24.finalCidrs&label=essential%20CIDR&color=success)](lists/essential-stats.json)
[![Full CIDR](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fkyoresuas%2Famnezia-split-tunneling%2Fmain%2Flists%2Fstats.json&query=%24.finalCidrs&label=full%20CIDR&color=blue)](lists/stats.json)
[![Update](https://github.com/kyoresuas/amnezia-split-tunneling/actions/workflows/update.yml/badge.svg)](https://github.com/kyoresuas/amnezia-split-tunneling/actions/workflows/update.yml)
[![License](https://img.shields.io/github/license/kyoresuas/amnezia-split-tunneling?color=lightgrey)](LICENSE)

Списки обновляются автоматически каждый день.

## Какой список выбрать

| Файл | Что внутри | Когда выбирать |
| --- | --- | --- |
| `ru-essential-bypass.json` | Банки, Мир/СБП, ключевые госсервисы, VK, ОК, Mail.ru, MAX, Дзен и Rutube | **Рекомендуется.** Жёсткий лимит сборки — 500 CIDR |
| `ru-bypass.json` | Полная RU-зона, операторы, CDN и другие сервисы | Только если клиент стабильно обрабатывает несколько тысяч маршрутов |

Если большой `ru-bypass.json` не импортируется, AmneziaVPN зависает при подключении или split tunneling работает нестабильно, используйте компактный `ru-essential-bypass.json`. Он создан специально для клиентов, которые плохо работают с большим числом маршрутов.

Компактный список не включает целиком подсети общих CDN и анти-DDoS-провайдеров. Для таких узлов генератор добавляет точные `/32`, чтобы не выводить из VPN чужие сайты. Поэтому важно использовать свежий ежедневный релиз.

## Быстрый старт

### 1. Скачайте рекомендуемый файл

```
https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-essential-bypass.json
```

Полный вариант доступен по прежнему адресу:

```
https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-bypass.json
```

### 2. Импортируйте в AmneziaVPN

1. Откройте AmneziaVPN.
2. Нажмите на подключение -> **Настройки подключения**.
3. Откройте **Split Tunneling** -> **Site-based split tunneling**.
4. Выберите **Addresses from the list should not be accessed via VPN**.
5. Нажмите ⋮ -> **Import** -> **Replace site list**.
6. Выберите скачанный JSON, включите split tunneling и переподключитесь.

В [документации Amnezia](https://docs.amnezia.org/ru/documentation/instructions/vpn-split-tunneling/) указано, что site-based split tunneling работает с IPv4, а домены при добавлении преобразуются в IP. Именно поэтому репозиторий хранит и обновляет уже готовые IP-маршруты.

## Как собран компактный список

- Домены банков сверяются с [реестром Банка России](https://www.cbr.ru/banking_sector/credit/cowebsites/).
- На дату аудита домены мобильных API сверены с 12 актуальными APK из [RuStore](https://www.rustore.ru/); пакеты и версии зафиксированы в конфиге.
- DNS проверяется системным резолвером, Google DNS и Cloudflare DNS.
- Префикс расширяется через [RIPE Stat](https://stat.ripe.net/) только если origin ASN принадлежит целевому сервису; иначе остаётся `/32`.
- Перед публикацией сборка агрегируется, очищается от приватных/bogon-адресов и проверяется на лимит 500 записей.

Перечень не пытается охватить каждый региональный банк и каждую ведомственную систему: это осознанный компромисс ради низкого числа маршрутов. Состав находится в [`config/essential-services.json`](config/essential-services.json).

## Windows: долгое подключение с большим списком

На Windows полный `ru-bypass.json` может надолго задерживать подключение — это [известная проблема клиента](https://github.com/amnezia-vpn/amnezia-client/issues/2248). Сначала попробуйте компактный список.

Для полного списка также есть:

- [артефакт CI с патчем](https://github.com/kyoresuas/amnezia-client/actions/runs/24824833799/artifacts/6597271360);
- [pull request в `amnezia-client`](https://github.com/amnezia-vpn/amnezia-client/pull/2516).

## Что-то не работает?

Узнайте IP проблемного сайта и проверьте его:

```bash
dig +short example.ru @1.1.1.1
dig +short example.ru @77.88.8.8  # Яндекс DNS может увидеть другой RU-CDN

npm run diff -- 95.213.45.12
```

- Для компактного списка добавьте домен в `config/essential-services.json` и укажите его ASN в `trustedAsns` только если сеть не является общим CDN.
- Для полного списка добавьте домен в `config/services.json` или CIDR в `lists/zones/custom.zone`.
- Если иностранный сервис идёт мимо VPN, добавьте его CIDR в `config/blacklist.txt`.

Если разобраться не получилось, [создайте issue](https://github.com/kyoresuas/amnezia-split-tunneling/issues/new) и укажите сервис, домен и IP.

## Ручное обновление

```bash
git clone https://github.com/kyoresuas/amnezia-split-tunneling.git
cd amnezia-split-tunneling
npm ci
npm run update
```

Команда собирает оба файла. Метаданные находятся в [`lists/essential-stats.json`](lists/essential-stats.json) и [`lists/stats.json`](lists/stats.json).

Полезные команды:

```bash
npm test               # тесты CIDR-арифметики и pipeline
npm run typecheck      # проверка типов TypeScript
npm run diff -- <IP>   # диагностика полного списка
```

## Связаться со мной

- **Telegram:** [@stercuss](https://t.me/stercuss)
- **Email:** hey@kyoresuas.com

## Лицензия

MIT — см. файл [`LICENSE`](LICENSE).
