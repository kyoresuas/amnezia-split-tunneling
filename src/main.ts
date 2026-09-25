import { parseArgs } from "node:util";
import { appLogger } from "@/config/logger";
import { runCheck, runTools, runUpdate, runVerify } from "@/commands";

// Справка по командам
const USAGE = [
  "Использование: tsx src/main.ts <команда> [флаги]",
  "",
  "  update            собрать все уровни и форматы (сеть, RIPE, DNS)",
  "  generate          то же из кэша, без сети",
  "  verify            проверить конфигурацию и ASN сервисов",
  "  check <ip|домен>  показать, в какие уровни входит адрес",
  "  tools             скачать sing-box и mihomo для бинарных форматов",
  "",
  "Флаги: --offline, --skip-asn-check",
].join("\n");

/**
 * Точка входа
 */
const bootstrap = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      offline: { type: "boolean", default: false },
      "skip-asn-check": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const [command, target] = positionals;

  if (values.help || !command) {
    process.stdout.write(USAGE + "\n");
    return;
  }

  switch (command) {
    case "update":
      await runUpdate({
        offline: values.offline,
        skipAsnCheck: values["skip-asn-check"],
      });
      return;

    case "generate":
      await runUpdate({ offline: true, skipAsnCheck: true });
      return;

    case "verify": {
      const errors = await runVerify(values.offline);

      if (errors.length > 0) process.exitCode = 1;
      return;
    }

    case "check": {
      if (!target) throw new Error("Укажите IP-адрес или домен");

      const found = await runCheck(target);

      if (!found) process.exitCode = 1;
      return;
    }

    case "tools":
      await runTools();
      return;

    default:
      throw new Error(`Неизвестная команда: ${command}\n\n${USAGE}`);
  }
};

bootstrap().catch((err) => {
  appLogger.fatal((err as Error).message);
  process.exit(1);
});
