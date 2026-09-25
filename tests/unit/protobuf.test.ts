import { it, expect, describe } from "vitest";
import { bytesField, varintField, encodeVarint } from "@/helpers/protobuf";

describe("protobuf", () => {
  it("кодирует varint", () => {
    expect([...encodeVarint(0)]).toEqual([0]);
    expect([...encodeVarint(1)]).toEqual([1]);
    expect([...encodeVarint(300)]).toEqual([0xac, 0x02]);
  });

  it("кодирует поля", () => {
    expect([...varintField(2, 24)]).toEqual([0x10, 24]);
    expect([...bytesField(1, "RU")]).toEqual([0x0a, 2, 0x52, 0x55]);
    expect([...bytesField(1, Buffer.from([1, 2, 3, 4]))]).toEqual([
      0x0a, 4, 1, 2, 3, 4,
    ]);
  });
});
