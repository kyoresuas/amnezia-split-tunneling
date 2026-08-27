import { describe, expect, it } from "vitest";
import { selectRoute } from "../src/core/route.js";

describe("selectRoute", () => {
  it("сохраняет прежнее поведение в режиме prefix", () => {
    expect(
      selectRoute(
        "203.0.113.7",
        { prefix: "203.0.113.0/24", asns: [64500] },
        [],
        "prefix",
      ),
    ).toEqual({ cidr: "203.0.113.0/24", trustedPrefix: false });
  });

  it("расширяет префикс только для доверенного ASN", () => {
    expect(
      selectRoute(
        "203.0.113.7",
        { prefix: "203.0.113.0/24", asns: [64500] },
        [64500],
        "trusted-prefix",
      ),
    ).toEqual({ cidr: "203.0.113.0/24", trustedPrefix: true });
  });

  it("не захватывает целую сеть общего CDN", () => {
    expect(
      selectRoute(
        "203.0.113.7",
        { prefix: "203.0.113.0/24", asns: [64501] },
        [64500],
        "trusted-prefix",
      ),
    ).toEqual({ cidr: "203.0.113.7/32", trustedPrefix: false });
  });

  it("оставляет /32, если RIPE временно недоступен", () => {
    expect(
      selectRoute("203.0.113.7", null, [64500], "trusted-prefix"),
    ).toEqual({ cidr: "203.0.113.7/32", trustedPrefix: false });
  });
});
