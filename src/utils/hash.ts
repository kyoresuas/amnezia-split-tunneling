import { createHash } from "node:crypto";

/**
 * Посчитать SHA-256 в hex
 */
export const sha256 = (content: string | Buffer): string =>
  createHash("sha256").update(content).digest("hex");
