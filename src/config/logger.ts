import chalk from "chalk";

/**
 * Текущее время для префикса строки лога
 */
const timestamp = (): string => {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");

  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

/**
 * Записать строку в stderr, чтобы stdout оставался для результатов команд
 */
const write = (message: string): void => {
  process.stderr.write(`${chalk.gray(`[${timestamp()}]`)} ${message}\n`);
};

/**
 * Система логов проекта
 */
export const appLogger = {
  /**
   * Обычное сообщение
   */
  info(message: string): void {
    write(message);
  },

  /**
   * Успешное завершение шага
   */
  ok(message: string): void {
    write(chalk.green(message));
  },

  /**
   * Заголовок этапа
   */
  step(message: string): void {
    write(chalk.bold(chalk.cyanBright(message)));
  },

  /**
   * Второстепенная информация
   */
  verbose(message: string): void {
    write(chalk.gray(message));
  },

  /**
   * Предупреждение, сборка продолжается
   */
  warn(message: string): void {
    write(chalk.yellow(message));
  },

  /**
   * Ошибка
   */
  error(message: string): void {
    write(chalk.red(message));
  },

  /**
   * Фатальная ошибка перед выходом
   */
  fatal(message: string): void {
    write(chalk.bgRedBright(chalk.black(" FATAL ")) + " " + chalk.red(message));
  },
};
