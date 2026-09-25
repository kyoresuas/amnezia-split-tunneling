import {
  statSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

/**
 * Создать каталог, если его нет
 */
export const ensureDir = (dir: string): void => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

/**
 * Прочитать текстовый файл или вернуть null
 */
export const readText = (path: string): string | null => {
  if (!existsSync(path)) return null;

  return readFileSync(path, "utf8");
};

/**
 * Прочитать JSON-файл или вернуть null
 */
export const readJson = <T>(path: string): T | null => {
  const text = readText(path);

  if (text === null) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

/**
 * Записать файл, создав каталог
 */
export const writeFile = (path: string, content: string | Buffer): void => {
  ensureDir(dirname(path));
  writeFileSync(path, content);
};

/**
 * Записать JSON с отступами
 */
export const writeJson = (path: string, value: unknown): void => {
  writeFile(path, JSON.stringify(value, null, 2) + "\n");
};

/**
 * Возраст файла в миллисекундах или null, если файла нет
 */
export const fileAge = (path: string): number | null => {
  if (!existsSync(path)) return null;

  return Date.now() - statSync(path).mtimeMs;
};

/**
 * Разобрать текстовый список: по записи в строке, комментарии после #
 */
export const parseLines = (text: string): string[] => {
  const out: string[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.split("#")[0]!.trim();

    if (line) out.push(line);
  }

  return out;
};
