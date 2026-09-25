/**
 * Минимальный кодировщик protobuf для geoip.dat и geosite.dat
 */

// Тип поля: число
const WIRE_VARINT = 0;

// Тип поля: байты, строка или вложенное сообщение
const WIRE_BYTES = 2;

/**
 * Закодировать число в varint
 */
export const encodeVarint = (value: number): Buffer => {
  const bytes: number[] = [];
  let n = value >>> 0;

  while (n >= 0x80) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }

  bytes.push(n);

  return Buffer.from(bytes);
};

/**
 * Заголовок поля
 */
const tag = (field: number, wire: number): Buffer =>
  encodeVarint((field << 3) | wire);

/**
 * Поле с числом
 */
export const varintField = (field: number, value: number): Buffer =>
  Buffer.concat([tag(field, WIRE_VARINT), encodeVarint(value)]);

/**
 * Поле с байтами, строкой или вложенным сообщением
 */
export const bytesField = (field: number, value: Buffer | string): Buffer => {
  const payload =
    typeof value === "string" ? Buffer.from(value, "utf8") : value;

  return Buffer.concat([
    tag(field, WIRE_BYTES),
    encodeVarint(payload.length),
    payload,
  ]);
};
