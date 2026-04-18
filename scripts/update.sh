#!/usr/bin/env bash

set -euo pipefail

# Директория скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Директория репозитория
ROOT="$(dirname "$SCRIPT_DIR")"

# Директория зон
ZONES_DIR="$ROOT/lists/zones"

# Директория списков
LISTS_DIR="$ROOT/lists"

# URL IPdeny
IPDENY_BASE="https://www.ipdeny.com/ipblocks/data/aggregated"

# URL escapingworm/russia-whitelist
MOBILE_URL="https://raw.githubusercontent.com/escapingworm/russia-whitelist/refs/heads/main/ru-whitelist-cidr.txt"

COMPACT_FLAG=""
if [[ "${1:-}" == "--compact" ]]; then
  COMPACT_FLAG="--compact"
fi

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || error "Node.js не найден"
command -v curl >/dev/null 2>&1 || error "curl не найден"

info "Node.js: $(node --version)"

mkdir -p "$ZONES_DIR"

download() {
  local name="$1" url="$2" dest="$3" required="${4:-false}"
  info "Скачиваю ${name}..."
  if curl -fsSL --retry 3 --retry-delay 2 -o "$dest" "$url"; then
    success "${name} обновлён"
  elif [[ "$required" == "true" ]]; then
    error "Не удалось скачать ${name}"
  else
    warn "Не удалось скачать ${name}"
    rm -f "$dest"
  fi
}

download "ru.zone" "$IPDENY_BASE/ru-aggregated.zone" "$ZONES_DIR/ru.zone" true
download "kz.zone" "$IPDENY_BASE/kz-aggregated.zone" "$ZONES_DIR/kz.zone" true
download "mobile.zone" "$MOBILE_URL" "$ZONES_DIR/mobile.zone" true

info "Резолвинг российских сервисов..."
node "$ROOT/src/resolve.js" \
  --config "$ROOT/config/services.json" \
  --output "$ZONES_DIR/services.zone" 2>&1

INPUT_FILES=()
for zone in ru kz mobile services custom; do
  [[ -f "$ZONES_DIR/${zone}.zone" ]] && INPUT_FILES+=("$ZONES_DIR/${zone}.zone")
done

[[ ${#INPUT_FILES[@]} -eq 0 ]] && error "Нет входных файлов для генерации"

info "Генерирую ru-bypass.json..."
node "$ROOT/src/generate.js" \
  $COMPACT_FLAG \
  -o "$LISTS_DIR/ru-bypass.json" \
  "${INPUT_FILES[@]}" 2>&1

ENTRY_COUNT=$(node -e "
  const f = require('fs').readFileSync('$LISTS_DIR/ru-bypass.json', 'utf8');
  console.log(JSON.parse(f).length);
")
FILE_SIZE=$(du -sh "$LISTS_DIR/ru-bypass.json" | cut -f1)

echo ""
success "Готово!"
echo -e "   Записей в списке: ${YELLOW}${ENTRY_COUNT}${NC}"
echo -e "   Размер файла: ${YELLOW}${FILE_SIZE}${NC}"
echo -e "   Файл: ${CYAN}lists/ru-bypass.json${NC}"
echo ""
