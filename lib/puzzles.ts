/**
 * Đọc bộ ezk puzzle từ `content/puzzles/wallets.json`.
 *
 * File JSON đó do `scripts/generate-puzzles.mts` sinh ra và **chỉ chứa dữ liệu
 * công khai**: bậc bit, khoảng khoá, public key, address. Private key nằm ở
 * `.secrets/puzzle-keys.json` (gitignore) — không có đường nào từ web chạm tới.
 *
 * Luật: ví bậc `n` có private key trong `[2^(n-1), 2^n - 1]`, giống Bitcoin
 * puzzle gốc. Vì public key đã lộ, bài toán là discrete log trong khoảng đã
 * biết: giải được bằng BSGS / Pollard kangaroo với `O(√W) ≈ 2^((n-1)/2)` phép
 * toán nhóm — mất đúng một nửa số bit so với khi chỉ biết address.
 */

import fs from "node:fs";
import path from "node:path";

/** Một dòng dữ liệu công khai trong wallets.json */
export interface PuzzleWallet {
  /** Bậc bit, 1..200 */
  bits: number;
  /** Đầu khoảng khoá = 2^(bits-1), hex không prefix */
  rangeStart: string;
  /** Cuối khoảng khoá = 2^bits − 1, hex không prefix */
  rangeEnd: string;
  /** Public key nén 33 byte — đã lộ, đó là cái làm nên puzzle này */
  pub: string;
  /** Address P2PKH */
  address: string;
}

export interface PuzzleSet {
  version: number;
  /** Ngày sinh bộ ví, YYYY-MM-DD */
  generatedAt: string;
  wallets: PuzzleWallet[];
}

/** Dòng đã format sẵn để đưa xuống client (client không cần biết fs, BigInt) */
export interface PuzzleRow extends PuzzleWallet {
  /** "2⁶⁵ → 2⁶⁶−1", hoặc số thập phân với bậc nhỏ */
  rangeLabel: string;
  /** log₂ số phép toán nhóm cần để giải khi đã biết public key */
  workLabel: string;
}

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  ".": "˙",
  "-": "⁻",
};

function superscript(text: string): string {
  return text
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
}

/** 64 → "2⁶⁴" */
export function pow2Label(exp: number): string {
  return (
    "2" + superscript(Number.isInteger(exp) ? String(exp) : exp.toFixed(1))
  );
}

/**
 * Chi phí giải khi public key đã lộ: Pollard kangaroo trên khoảng rộng
 * `W = 2^(bits-1)` cần ≈ `2√W` phép toán nhóm ⇒ `log₂ ≈ (bits-1)/2 + 1`.
 */
export function workLog2(bits: number): number {
  return Math.max(0, (bits - 1) / 2 + 1);
}

const WALLETS_FILE = path.join(
  process.cwd(),
  "content",
  "puzzles",
  "wallets.json",
);

let cache: PuzzleSet | null = null;

export function getPuzzleSet(): PuzzleSet {
  if (cache) return cache;
  const raw = fs.readFileSync(WALLETS_FILE, "utf8");
  cache = JSON.parse(raw) as PuzzleSet;
  return cache;
}

export function getPuzzleRows(): PuzzleRow[] {
  const { wallets } = getPuzzleSet();
  return wallets.map((w) => {
    const start = BigInt("0x" + w.rangeStart);
    const end = BigInt("0x" + w.rangeEnd);
    return {
      ...w,
      rangeLabel:
        w.bits <= 20
          ? `${start.toString()} → ${end.toString()}`
          : `${pow2Label(w.bits - 1)} → ${pow2Label(w.bits)}−1`,
      workLabel: pow2Label(Math.round(workLog2(w.bits) * 10) / 10),
    };
  });
}
