import { log } from "./utils/log.js";
import { resolve, basename } from "path";
import { readFileSync, writeFileSync } from "fs";

const args = process.argv.slice(2);

// Input files
const inputs = [];

// Output file
let output = "lists/ru-bypass.json";

// Compact flag
let compact = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--output") output = args[++i];
  else if (args[i] === "--compact") compact = true;
  else if (!args[i].startsWith("-")) inputs.push(args[i]);
}

if (inputs.length === 0) {
  log.error(
    "Использование: node src/generate.js [--compact] -o <output.json> <input.zone> [...]",
  );
  process.exit(1);
}

/**
 * Парсинг zone-файла
 */
function parseZone(filePath) {
  const cidrs = [];
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(line)) cidrs.push(line);
    else log.warn(`Пропущена невалидная запись: "${line}"`);
  }
  return cidrs;
}

/**
 * Сортировка по IP
 */
function ipToInt(cidr) {
  return (
    cidr
      .split("/")[0]
      .split(".")
      .reduce((acc, o) => (acc << 8) | parseInt(o, 10), 0) >>> 0
  );
}

let all = [];

// Загрузка CIDR из файлов
for (const input of inputs) {
  const loaded = parseZone(input);
  log.info(`${basename(input)}: загружено ${loaded.length} CIDR`);
  all.push(...loaded);
}

// Удаление дубликатов
const before = all.length;
const unique = [...new Map(all.map((c) => [c, true])).keys()].sort(
  (a, b) => ipToInt(a) - ipToInt(b),
);

if (before - unique.length > 0)
  log.info(`Удалено дубликатов: ${before - unique.length}`);

const result = unique.map((cidr) => ({ hostname: cidr, ip: "" }));
const json = compact ? JSON.stringify(result) : JSON.stringify(result, null, 2);

writeFileSync(resolve(output), json, "utf8");

log.ok(`Записано ${result.length} записей -> ${basename(output)}`);
