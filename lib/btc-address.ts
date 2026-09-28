/**
 * Địa chỉ Bitcoin P2PKH từ public key — server-only (dùng `node:crypto` cho
 * SHA-256).
 *
 * RIPEMD-160 viết tay vì OpenSSL 3 đẩy nó xuống legacy provider, `createHash
 * ("ripemd160")` có thể throw tuỳ bản Node/OS. Implement thuần JS thì chắc
 * chắn chạy ở mọi môi trường build.
 *
 * Chuỗi biến đổi: pubkey → SHA-256 → RIPEMD-160 (= hash160) → thêm version
 * byte 0x00 → base58check.
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// RIPEMD-160 (RFC-less, theo đặc tả Dobbertin–Bosselaers–Preneel 1996)
// ---------------------------------------------------------------------------

/** Thứ tự word của message trong nhánh trái */
const RL = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
  1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13,
];

/** Thứ tự word của message trong nhánh phải */
const RR = [
  5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
  6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
  8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11,
];

/** Số bit dịch vòng, nhánh trái */
const SL = [
  11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
  7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
  11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6,
];

/** Số bit dịch vòng, nhánh phải */
const SR = [
  8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
  9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
  15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11,
];

const KL = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e];
const KR = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];

function rol(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function f(round: number, x: number, y: number, z: number): number {
  if (round < 16) return (x ^ y ^ z) >>> 0;
  if (round < 32) return ((x & y) | (~x & z)) >>> 0;
  if (round < 48) return ((x | ~y) ^ z) >>> 0;
  if (round < 64) return ((x & z) | (y & ~z)) >>> 0;
  return (x ^ (y | ~z)) >>> 0;
}

export function ripemd160(message: Uint8Array): Uint8Array {
  // padding kiểu MD4: 0x80, zeros, rồi 64-bit little-endian độ dài bit
  const bitLen = BigInt(message.length) * 8n;
  const padded = new Uint8Array(((message.length + 8) >> 6 << 6) + 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Number(bitLen & 0xffffffffn), true);
  view.setUint32(padded.length - 4, Number((bitLen >> 32n) & 0xffffffffn), true);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const X = new Array<number>(16);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) X[i] = view.getUint32(off + i * 4, true);

    let al = h0;
    let bl = h1;
    let cl = h2;
    let dl = h3;
    let el = h4;
    let ar = h0;
    let br = h1;
    let cr = h2;
    let dr = h3;
    let er = h4;

    for (let j = 0; j < 80; j++) {
      const k = (j / 16) | 0;
      let t =
        (rol(
          (al + f(j, bl, cl, dl) + X[RL[j]] + KL[k]) >>> 0,
          SL[j],
        ) +
          el) >>>
        0;
      al = el;
      el = dl;
      dl = rol(cl, 10);
      cl = bl;
      bl = t;

      t =
        (rol(
          (ar + f(79 - j, br, cr, dr) + X[RR[j]] + KR[k]) >>> 0,
          SR[j],
        ) +
          er) >>>
        0;
      ar = er;
      er = dr;
      dr = rol(cr, 10);
      cr = br;
      br = t;
    }

    const t = (h1 + cl + dr) >>> 0;
    h1 = (h2 + dl + er) >>> 0;
    h2 = (h3 + el + ar) >>> 0;
    h3 = (h4 + al + br) >>> 0;
    h4 = (h0 + bl + cr) >>> 0;
    h0 = t;
  }

  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, h0, true);
  ov.setUint32(4, h1, true);
  ov.setUint32(8, h2, true);
  ov.setUint32(12, h3, true);
  ov.setUint32(16, h4, true);
  return out;
}

// ---------------------------------------------------------------------------
// Base58Check + P2PKH
// ---------------------------------------------------------------------------

const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (const b of bytes) num = (num << 8n) | BigInt(b);
  let out = "";
  while (num > 0n) {
    const rem = Number(num % 58n);
    num /= 58n;
    out = B58_ALPHABET[rem] + out;
  }
  // mỗi byte 0x00 ở đầu → một ký tự '1'
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}

export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

export function base58Check(payload: Uint8Array, version = 0x00): string {
  const body = new Uint8Array(payload.length + 1);
  body[0] = version;
  body.set(payload, 1);
  const checksum = sha256(sha256(body)).slice(0, 4);
  const full = new Uint8Array(body.length + 4);
  full.set(body);
  full.set(checksum, body.length);
  return base58Encode(full);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Địa chỉ P2PKH (legacy, bắt đầu bằng '1') từ public key hex */
export function p2pkhAddress(pubkeyHex: string): string {
  return base58Check(hash160(hexToBytes(pubkeyHex)));
}
