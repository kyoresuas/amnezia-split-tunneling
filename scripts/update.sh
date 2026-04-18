#!/usr/bin/env bash

set -euo pipefail

# Директория скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Директория репозитория
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Директория списков
LISTS_DIR="$REPO_DIR/lists"

# ipdeny url
IPDENY_URL="https://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone"

# mobile url
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

mkdir -p "$LISTS_DIR"

info "Скачиваю ru-aggregated.zone..."
curl -fsSL --retry 3 --retry-delay 2 \
  -o "$LISTS_DIR/ru-aggregated.zone" \
  "$IPDENY_URL" \
  && success "ru-aggregated.zone обновлен" \
  || error "Не удалось скачать ru-aggregated.zone"

info "Скачиваю ru-mobile.zone..."
curl -fsSL --retry 3 --retry-delay 2 \
  -o "$LISTS_DIR/ru-mobile.zone" \
  "$MOBILE_URL" \
  && success "ru-mobile.zone обновлен" \
  || warn "Не удалось скачать ru-mobile.zone (пропускаем)"

INPUT_FILES=()
[[ -f "$LISTS_DIR/ru-aggregated.zone" ]] && INPUT_FILES+=("$LISTS_DIR/ru-aggregated.zone")
[[ -f "$LISTS_DIR/ru-mobile.zone"     ]] && INPUT_FILES+=("$LISTS_DIR/ru-mobile.zone")

if [[ ${#INPUT_FILES[@]} -eq 0 ]]; then
  error "Нет входных файлов для генерации"
fi

info "Генерирую ru-bypass.json..."
node "$SCRIPT_DIR/generate.mjs" \
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
