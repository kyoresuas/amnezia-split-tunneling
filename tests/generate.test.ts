import {
  rmSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runGenerate } from "../src/generate.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ast-gen-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function writeZone(name: string, content: string): string {
  const p = join(workDir, name);
  writeFileSync(p, content, "utf8");
  return p;
}

describe("generate pipeline", () => {
  it("парсит зоны, агрегирует, пишет ru-bypass.json и stats.json", async () => {
    const zoneA = writeZone(
      "a.zone",
      ["# header", "1.0.0.0/25", "1.0.0.128/25", "2.0.0.0/24"].join("\n"),
    );
    const zoneB = writeZone("b.zone", ["1.0.0.0/24", "3.0.0.0/24"].join("\n"));
    const blacklist = writeZone("blacklist.txt", "");
    const output = join(workDir, "ru-bypass.json");
    const stats = join(workDir, "stats.json");

    await runGenerate([
      zoneA,
      zoneB,
      "-o",
      output,
      "--blacklist",
      blacklist,
      "--stats",
      stats,
      "--compact",
    ]);

    expect(existsSync(output)).toBe(true);
    const data = JSON.parse(readFileSync(output, "utf8")) as Array<{
      hostname: string;
      ip: string;
    }>;
    const hostnames = data.map((d) => d.hostname);
    expect(hostnames).toStrictEqual(["1.0.0.0/24", "2.0.0.0/24", "3.0.0.0/24"]);
    expect(data.every((d) => d.ip === "")).toBe(true);

    expect(existsSync(stats)).toBe(true);
    const statsObj = JSON.parse(readFileSync(stats, "utf8"));
    expect(statsObj.finalCidrs).toBe(3);
    expect(statsObj.zones["a.zone"].cidrs).toBe(3);
    expect(statsObj.zones["b.zone"].cidrs).toBe(2);
    expect(statsObj.aggregation.before).toBeGreaterThan(
      statsObj.aggregation.after,
    );
    expect(statsObj.blacklist.rules).toBe(0);
  });

  it("вычитает blacklist из финального списка", async () => {
    const zone = writeZone("z.zone", ["1.2.3.0/24"].join("\n"));
    const blacklist = writeZone("blacklist.txt", "1.2.3.0/25\n");
    const output = join(workDir, "ru-bypass.json");

    await runGenerate([
      zone,
      "-o",
      output,
      "--blacklist",
      blacklist,
      "--no-stats",
      "--compact",
    ]);

    const data = JSON.parse(readFileSync(output, "utf8")) as Array<{
      hostname: string;
    }>;
    expect(data.map((d) => d.hostname)).toStrictEqual(["1.2.3.128/25"]);
  });

  it("считает diff с предыдущей версией ru-bypass.json", async () => {
    const zone = writeZone("z.zone", ["1.0.0.0/24", "2.0.0.0/24"].join("\n"));
    const blacklist = writeZone("blacklist.txt", "");
    const output = join(workDir, "ru-bypass.json");
    const stats = join(workDir, "stats.json");

    writeFileSync(
      output,
      JSON.stringify([{ hostname: "1.0.0.0/24", ip: "" }]),
      "utf8",
    );

    await runGenerate([
      zone,
      "-o",
      output,
      "--blacklist",
      blacklist,
      "--stats",
      stats,
      "--compact",
    ]);

    const statsObj = JSON.parse(readFileSync(stats, "utf8"));
    expect(statsObj.diff.added).toBe(1);
    expect(statsObj.diff.removed).toBe(0);
  });
});
