# Amnezia Split Tunneling

Готовый список российских IP-адресов для раздельного туннелирования в [AmneziaVPN](https://amnezia.org). После настройки российские сервисы работают напрямую, весь остальной трафик идёт через VPN.

Список обновляется автоматически каждый день.

## Быстрый старт

### Скачайте файл

Скачайте актуальный `ru-bypass.json` из [последнего релиза](https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest):

```
https://github.com/kyoresuas/amnezia-split-tunneling/releases/latest/download/ru-bypass.json
```

### Импортируйте в AmneziaVPN

1. Откройте AmneziaVPN
2. Нажмите на подключение -> **Настройки подключения**
3. Перейдите в раздел **Split Tunneling**
4. Выберите **Site-based split tunneling**
5. Выберите режим: **Addresses from the list should not be accessed via VPN**
6. Нажмите ⋮, потом **Import**
7. Выберите: **Replace site list**
8. Выберите скачанный `ru-bypass.json`
9. Включите split tunneling и подключитесь

## Windows: долгое подключение с большим списком

На Windows с крупным split-tunnel списком (в том числе с этим `ru-bypass.json`) иногда очень долго висит этап подключения или оно не завершается - это [известная проблема клиента](https://github.com/amnezia-vpn/amnezia-client/issues/2248).

Пока исправление не вошло в официальный релиз, можно поставить **сборку AmneziaVPN с патчем**:

- [артефакт CI](https://github.com/kyoresuas/amnezia-client/actions/runs/24824833799/artifacts/6597271360)
- [pull request в `amnezia-client`](https://github.com/amnezia-vpn/amnezia-client/pull/2516) - там описание и обсуждение; после мержа можно снова перейти на обычные сборки Amnezia.

## Источники

| Источник                                                                              | Что содержит                  |
| ------------------------------------------------------------------------------------- | ----------------------------- |
| [ipdeny.com — RU](https://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone) | IP-блоки России               |
| [escapingworm/russia-whitelist](https://github.com/escapingworm/russia-whitelist)     | IP мобильных операторов РФ    |
| [bgpview.io](https://bgpview.io/) / [stat.ripe.net](https://stat.ripe.net/)           | ASN-префиксы крупных сервисов |

## Что-то не работает?

Узнайте IP проблемного сайта и проверьте его в наших списках:

```bash
dig +short example.ru @1.1.1.1
dig +short example.ru @77.88.8.8 # Яндекс DNS - найдёт RU-CDN

npm run diff -- 95.213.45.12
```

Сценарии:

- Российский сервис идёт через VPN - IP не нашёлся ни в одной зоне ->
  добавьте домен в `config/services.json` или CIDR в `lists/zones/custom.zone`
- Иностранный сервис идёт мимо VPN — IP нашёлся ->
  добавьте его CIDR в `config/blacklist.txt`

Если разобраться не получилось - [создайте issue](https://github.com/kyoresuas/amnezia-split-tunneling/issues/new), укажите название сервиса и(или) домен.

## Кастомизация

| Что сделать                 | Где менять                                  |
| --------------------------- | ------------------------------------------- |
| Добавить российский сервис  | `config/services.json` -> секция `services` |
| Добавить организацию по ASN | `config/services.json` -> секция `asns`     |
| Добавить IP вручную         | `lists/zones/custom.zone`                   |
| Исключить IP из списка      | `config/blacklist.txt`                      |

## Последняя сборка

Метаданные каждой сборки - в [`lists/stats.json`](lists/stats.json):
сколько CIDR в каждой зоне, сколько удалено агрегацией, дифф с прошлой.

## Ручное обновление

```bash
git clone https://github.com/kyoresuas/amnezia-split-tunneling.git
cd amnezia-split-tunneling
npm ci
bash scripts/update.sh
```

Полезные команды:

```bash
npm test               # запустить тесты CIDR-арифметики и pipeline
npm run typecheck      # проверка типов TypeScript
npm run diff -- <IP>   # диагностика: где попал/не попал IP
npm run asn            # обновить только ASN-префиксы
```

## Связаться со мной

- **Telegram:** @stercuss
- **Email:** hey@kyoresuas.com

## Лицензия

MIT — см. файл `LICENSE`.
