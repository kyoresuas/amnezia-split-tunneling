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
4. Выберите режим: **«Адреса из списка НЕ идут через VPN»**
5. Нажмите ⋮ -> **Заменить список сайтов**
6. Выберите скачанный `ru-bypass.json`
7. Включите split tunneling и подключитесь

## Источники

| Источник | Что содержит |
|---|---|
| [ipdeny.com](https://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone) | IP-блоки, выделенные России |
| [escapingworm/russia-whitelist](https://github.com/escapingworm/russia-whitelist) | IP мобильных операторов РФ |

## Ручное обновление

```bash
git clone https://github.com/kyoresuas/amnezia-split-tunneling.git
cd amnezia-split-tunneling
bash scripts/update.sh
```

## Связаться со мной

- **Telegram:** @stercuss
- **Email:** hey@kyoresuas.com

## Лицензия

MIT — см. файл `LICENSE`.
