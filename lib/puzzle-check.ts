/**
 * Kiểm tra private key người giải nhập vào — chạy hoàn toàn trong máy họ.
 *
 * Cách kiểm tra là toàn bộ nội dung của puzzle: tính `k·G`, nén lại, so với
 * public key đã công bố. Không cần biết đáp án, không gửi khoá đi đâu.
 */

import { compress, mul } from "@/lib/secp256k1";

/** Phần dữ liệu công khai cần để kiểm tra một bài */
export interface CheckTarget {
  /** Public key nén đã công bố */
  pub: string;
  /** Đầu khoảng khoá, hex không prefix */
  rangeStart: string;
  /** Cuối khoảng khoá, hex không prefix */
  rangeEnd: string;
}

export type CheckResult =
  | { ok: true; privHex: string }
  | { ok: false; reason: "empty" | "unparsed" | "outside" | "wrong" };

/**
 * Chấp nhận cả hex ("0x…" hoặc trần) và thập phân. Chuỗi như "123" hợp lệ ở
 * cả hai cách đọc ⇒ trả về cả hai, cách nào khớp public key thì lấy.
 */
export function parseKeyCandidates(input: string): bigint[] {
  const raw = input.trim().replace(/\s+/g, "");
  if (!raw) return [];

  const out: bigint[] = [];
  const hexBody = raw.replace(/^0x/i, "");
  if (/^[0-9a-f]+$/i.test(hexBody) && hexBody.length <= 64) {
    out.push(BigInt("0x" + hexBody));
  }
  // chỉ đọc theo thập phân khi người dùng không ghi tiền tố 0x
  if (!/^0x/i.test(raw) && /^[0-9]+$/.test(raw)) {
    const dec = BigInt(raw);
    if (!out.includes(dec)) out.push(dec);
  }
  return out;
}

export function checkPrivateKey(
  input: string,
  target: CheckTarget,
): CheckResult {
  if (input.trim() === "") return { ok: false, reason: "empty" };

  const candidates = parseKeyCandidates(input);
  if (candidates.length === 0) return { ok: false, reason: "unparsed" };

  for (const k of candidates) {
    if (k <= 0n) continue;
    const point = mul(k);
    if (point !== null && compress(point) === target.pub) {
      return { ok: true, privHex: k.toString(16).padStart(64, "0") };
    }
  }

  // không khớp: phân biệt "nhập sai bài" với "khoá sai"
  const start = BigInt("0x" + target.rangeStart);
  const end = BigInt("0x" + target.rangeEnd);
  const allOutside = candidates.every((k) => k < start || k > end);
  return { ok: false, reason: allOutside ? "outside" : "wrong" };
}
