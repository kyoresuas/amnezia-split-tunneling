const COLORS = {
  cyan: "\x1b[0;36m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  red: "\x1b[0;31m",
  reset: "\x1b[0m",
};

const write = (str) => process.stderr.write(str + "\n");

export const log = {
  info: (...a) => write(`${COLORS.cyan}[INFO]${COLORS.reset} ${a.join(" ")}`),
  ok: (...a) => write(`${COLORS.green}[OK]${COLORS.reset}   ${a.join(" ")}`),
  warn: (...a) => write(`${COLORS.yellow}[WARN]${COLORS.reset} ${a.join(" ")}`),
  error: (...a) => write(`${COLORS.red}[ERROR]${COLORS.reset} ${a.join(" ")}`),
};
