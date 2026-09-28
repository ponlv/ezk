/**
 * Sinh bộ 200 ví cho ezk puzzle — chạy MỘT LẦN, không chạy lại.
 *
 *     node scripts/generate-puzzles.ts            # sinh mới (từ chối ghi đè)
 *     node scripts/generate-puzzles.ts --force    # ghi đè, phá bộ puzzle cũ
 *
 * Ví bậc `n` có private key ngẫu nhiên trong `[2^(n-1), 2^n - 1]` — đúng luật
 * Bitcoin puzzle gốc. Script xuất ra hai file:
 *
 *   content/puzzles/wallets.json   PUBLIC  — bậc, khoảng khoá, public key,
 *                                            address. File này commit vào repo,
 *                                            trang /puzzles đọc trực tiếp.
 *   .secrets/puzzle-keys.json      PRIVATE — kèm private key. Đã gitignore,
 *                                            chmod 600. Mất file này là mất ví.
 *
 * Khoá lấy từ CSPRNG của OS (`crypto.randomBytes`) + rejection sampling nên
 * phân phối đều trong khoảng, không có seed nào để người giải đoán ngược.
 *
 * Lưu ý về bậc thấp: bậc 1 chỉ có duy nhất khoá `1`, bậc 2 có `{2, 3}`… nên
 * vài ví đầu không phải bí mật — đó là bản chất của puzzle, không phải lỗi.
 */

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compress, mul } from "../lib/secp256k1.ts";
import { p2pkhAddress } from "../lib/btc-address.ts";

const MAX_BITS = 200;
const ROOT = process.cwd();
const PUBLIC_FILE = path.join(ROOT, "content", "puzzles", "wallets.json");
const SECRET_FILE = path.join(ROOT, ".secrets", "puzzle-keys.json");

/** Số nguyên ngẫu nhiên đều trong [0, limit) — rejection sampling, không modulo bias */
function randomBelow(limit: bigint): bigint {
  if (limit <= 0n) throw new Error("randomBelow: limit phải > 0");
  const bits = limit.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const excessBits = BigInt(bytes * 8 - bits);
  for (;;) {
    let value = 0n;
    for (const byte of randomBytes(bytes)) value = (value << 8n) | BigInt(byte);
    value >>= excessBits; // cắt về đúng số bit, giữ phân phối đều
    if (value < limit) return value;
  }
}

function generate() {
  const publicRows = [];
  const secretRows = [];

  for (let bits = 1; bits <= MAX_BITS; bits++) {
    const start = 1n << BigInt(bits - 1);
    const end = (1n << BigInt(bits)) - 1n;
    const priv = start + randomBelow(end - start + 1n);

    const point = mul(priv);
    if (point === null) throw new Error(`bậc ${bits}: khoá ra điểm vô cực`);
    const pub = compress(point);

    if (priv < start || priv > end) throw new Error(`bậc ${bits}: khoá ngoài khoảng`);

    publicRows.push({
      bits,
      rangeStart: start.toString(16),
      rangeEnd: end.toString(16),
      pub,
      address: p2pkhAddress(pub),
    });

    secretRows.push({
      bits,
      privHex: priv.toString(16).padStart(64, "0"),
      privDec: priv.toString(10),
      pub,
      address: p2pkhAddress(pub),
    });
  }

  return { publicRows, secretRows };
}

function main() {
  const force = process.argv.includes("--force");
  const existing = [PUBLIC_FILE, SECRET_FILE].filter((f) => existsSync(f));
  if (existing.length > 0 && !force) {
    console.error("Đã có file:");
    for (const f of existing) console.error("  " + path.relative(ROOT, f));
    console.error(
      "\nGhi đè sẽ tạo bộ khoá MỚI và huỷ toàn bộ puzzle đang công bố.\n" +
        "Chắc chắn thì chạy lại với --force.",
    );
    process.exit(1);
  }

  const { publicRows, secretRows } = generate();
  const generatedAt = new Date().toISOString().slice(0, 10);

  mkdirSync(path.dirname(PUBLIC_FILE), { recursive: true });
  writeFileSync(
    PUBLIC_FILE,
    JSON.stringify({ version: 1, generatedAt, wallets: publicRows }, null, 2) + "\n",
  );

  mkdirSync(path.dirname(SECRET_FILE), { recursive: true, mode: 0o700 });
  writeFileSync(
    SECRET_FILE,
    JSON.stringify({ version: 1, generatedAt, keys: secretRows }, null, 2) + "\n",
    { mode: 0o600 },
  );
  chmodSync(SECRET_FILE, 0o600);

  console.log(`Đã sinh ${publicRows.length} ví (bậc 1 → ${MAX_BITS}).`);
  console.log("  public :", path.relative(ROOT, PUBLIC_FILE));
  console.log("  private:", path.relative(ROOT, SECRET_FILE), "(chmod 600, đã gitignore)");
  console.log(
    "\nBACKUP file private ra chỗ an toàn (offline) trước khi nạp BTC vào bất kỳ ví nào.",
  );
}

main();
