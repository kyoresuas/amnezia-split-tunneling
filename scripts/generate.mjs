#!/usr/bin/env node

import { resolve, basename } from "path";
import { readFileSync, writeFileSync } from "fs";

const COLORS = {
  cyan: "\x1b[0;36m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  reset: "\x1b[0m",
};

const log = {
  info: (...a) =>
    process.stderr.write(
      `${COLORS.cyan}[INFO]${COLORS.reset} ${a.join(" ")}\n`,
    ),
  ok: (...a) =>
    process.stderr.write(
      `${COLORS.green}[OK]${COLORS.reset}   ${a.join(" ")}\n`,
    ),
  warn: (...a) =>
    process.stderr.write(
      `${COLORS.yellow}[WARN]${COLORS.reset} ${a.join(" ")}\n`,
    ),
};

// CLI-аргументы

const args = process.argv.slice(2);
const inputs = [];

// Output file
let output = "lists/ru-bypass.json";

// Compact flag
let compact = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--output") {
    output = args[++i];
  } else if (args[i] === "--compact") {
    compact = true;
  } else if (!args[i].startsWith("-")) {
    inputs.push(args[i]);
  }
}

if (inputs.length === 0) {
  console.error(
    "Использование: node scripts/generate.mjs [--compact] -o <output.json> <input.zone> [input2.zone ...]",
  );
  process.exit(1);
}

/**
 * Парсинг CIDR-файла
 */
function parseCidrs(filePath) {
  const text = readFileSync(filePath, "utf8");
  const cidrs = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(line)) {
      cidrs.push(line);
    } else {
      log.warn(`Пропущена невалидная запись: "${line}"`);
    }
  }

  return cidrs;
}

/**
 * Конвертирует CIDR в 32-битное число для сортировки
 */
function cidrToInt(cidr) {
  const [ip] = cidr.split("/");
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0
  );
}

let allCidrs = [];

for (const input of inputs) {
  const loaded = parseCidrs(input);
  log.info(`${basename(input)}: загружено ${loaded.length} CIDR`);
  allCidrs.push(...loaded);
}

// Дедупликация + сортировка
const before = allCidrs.length;
const uniqueMap = new Map(allCidrs.map((c) => [c, true]));
allCidrs = [...uniqueMap.keys()].sort((a, b) => cidrToInt(a) - cidrToInt(b));
const removed = before - allCidrs.length;
if (removed > 0) {
  log.info(`Удалено дубликатов: ${removed}`);
}

// Конвертация в формат AmneziaVPN
const result = allCidrs.map((cidr) => ({ hostname: cidr, ip: "" }));

// Запись
const json = compact ? JSON.stringify(result) : JSON.stringify(result, null, 2);

writeFileSync(resolve(output), json, "utf8");

log.ok(`Записано ${result.length} записей -> ${basename(output)}`);
