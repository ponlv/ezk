/**
 * secp256k1 thuần BigInt — không phụ thuộc thư viện ngoài.
 *
 * Mục đích: dùng được ở CẢ server (sinh dữ liệu puzzle lúc build) và client
 * (solver BSGS chạy trong trình duyệt). Vì vậy file này KHÔNG import
 * `node:crypto` hay bất cứ thứ gì server-only.
 *
 * Cảnh báo: đây là code học tập — không constant-time, không chống
 * side-channel. Đừng dùng để giữ tiền thật.
 *
 * Toạ độ Jacobian `(X, Y, Z)` biểu diễn điểm affine `(X/Z², Y/Z³)`, với
 * `Z = 0` là điểm vô cực. Lý do dùng Jacobian: phép cộng/nhân đôi không cần
 * nghịch đảo modular (rất đắt), chỉ cần 1 lần nghịch đảo ở bước cuối khi
 * chuyển về affine.
 */

/** Đặc số của field: p = 2²⁵⁶ − 2³² − 977 */
export const P =
  0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;

/** Bậc của nhóm sinh bởi G */
export const N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

/** Đường cong: y² = x³ + 7 (a = 0, b = 7) */
export const CURVE_B = 7n;

export interface Point {
  x: bigint;
  y: bigint;
}

/** Điểm sinh chuẩn của secp256k1 */
export const G: Point = {
  x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
};

export function mod(a: bigint, m: bigint = P): bigint {
  const r = a % m;
  return r >= 0n ? r : r + m;
}

/** Nghịch đảo modular bằng extended Euclid (nhanh hơn Fermat ~3×) */
export function invMod(a: bigint, m: bigint = P): bigint {
  let r0 = mod(a, m);
  let r1 = m;
  let s0 = 1n;
  let s1 = 0n;
  if (r0 === 0n) throw new Error("invMod: 0 không có nghịch đảo");
  while (r1 !== 0n) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return mod(s0, m);
}

export function powMod(base: bigint, exp: bigint, m: bigint = P): bigint {
  let result = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = mod(result * b, m);
    b = mod(b * b, m);
    e >>= 1n;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Toạ độ Jacobian
// ---------------------------------------------------------------------------

interface Jac {
  X: bigint;
  Y: bigint;
  Z: bigint;
}

const JAC_ZERO: Jac = { X: 0n, Y: 1n, Z: 0n };

function jacFromAffine(p: Point): Jac {
  return { X: p.x, Y: p.y, Z: 1n };
}

/** dbl-2009-l — nhân đôi cho curve có a = 0 */
function jacDouble(p: Jac): Jac {
  const { X, Y, Z } = p;
  if (Z === 0n || Y === 0n) return JAC_ZERO;
  const XX = mod(X * X);
  const YY = mod(Y * Y);
  const YYYY = mod(YY * YY);
  const ZZ = mod(Z * Z);
  const t = mod(X + YY);
  const S = mod(2n * (mod(t * t) - XX - YYYY));
  const M = mod(3n * XX);
  const T = mod(M * M - 2n * S);
  const u = mod(Y + Z);
  return {
    X: T,
    Y: mod(M * (S - T) - 8n * YYYY),
    Z: mod(mod(u * u) - YY - ZZ),
  };
}

/** madd-2007-bl — cộng Jacobian + affine (Z₂ = 1) */
function jacAddAffine(p: Jac, q: Point): Jac {
  if (p.Z === 0n) return jacFromAffine(q);
  const Z1Z1 = mod(p.Z * p.Z);
  const U2 = mod(q.x * Z1Z1);
  const S2 = mod(q.y * mod(p.Z * Z1Z1));
  const H = mod(U2 - p.X);
  const r = mod(2n * (S2 - p.Y));
  if (H === 0n) {
    // cùng hoành độ: hoặc P = Q (nhân đôi), hoặc P = −Q (ra vô cực)
    return r === 0n ? jacDouble(p) : JAC_ZERO;
  }
  const HH = mod(H * H);
  const I = mod(4n * HH);
  const J = mod(H * I);
  const V = mod(p.X * I);
  const X3 = mod(mod(r * r) - J - 2n * V);
  const t = mod(p.Z + H);
  return {
    X: X3,
    Y: mod(r * (V - X3) - 2n * mod(p.Y * J)),
    Z: mod(mod(t * t) - Z1Z1 - HH),
  };
}

function jacToAffine(p: Jac): Point | null {
  if (p.Z === 0n) return null;
  const zi = invMod(p.Z);
  const zi2 = mod(zi * zi);
  return { x: mod(p.X * zi2), y: mod(p.Y * mod(zi2 * zi)) };
}

/**
 * Nghịch đảo hàng loạt bằng thủ thuật Montgomery: n phần tử chỉ cần
 * 1 lần `invMod` + 3n phép nhân, thay vì n lần `invMod`.
 * Phần tử `0n` được giữ nguyên là `0n` (điểm vô cực).
 */
function batchInvert(zs: bigint[]): bigint[] {
  const len = zs.length;
  const prefix = new Array<bigint>(len);
  let run = 1n;
  for (let i = 0; i < len; i++) {
    prefix[i] = run;
    if (zs[i] !== 0n) run = mod(run * zs[i]);
  }
  let inv = invMod(run);
  const out = new Array<bigint>(len);
  for (let i = len - 1; i >= 0; i--) {
    if (zs[i] === 0n) {
      out[i] = 0n;
      continue;
    }
    out[i] = mod(prefix[i] * inv);
    inv = mod(inv * zs[i]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// API công khai
// ---------------------------------------------------------------------------

/** k · base (mặc định base = G). Trả `null` nếu ra điểm vô cực. */
export function mul(k: bigint, base: Point = G): Point | null {
  const scalar = mod(k, N);
  if (scalar === 0n) return null;
  let acc = JAC_ZERO;
  const bits = scalar.toString(2);
  for (let i = 0; i < bits.length; i++) {
    acc = jacDouble(acc);
    if (bits[i] === "1") acc = jacAddAffine(acc, base);
  }
  return jacToAffine(acc);
}

export function add(a: Point | null, b: Point | null): Point | null {
  if (a === null) return b;
  if (b === null) return a;
  return jacToAffine(jacAddAffine(jacFromAffine(a), b));
}

export function negate(p: Point): Point {
  return { x: p.x, y: mod(-p.y) };
}

export function isOnCurve(p: Point): boolean {
  return mod(p.y * p.y) === mod(mod(p.x * p.x * p.x) + CURVE_B);
}

/** Public key nén: prefix 02/03 + 32 byte hoành độ */
export function compress(p: Point): string {
  const prefix = (p.y & 1n) === 0n ? "02" : "03";
  return prefix + p.x.toString(16).padStart(64, "0");
}

/** Public key không nén: 04 + x + y */
export function uncompress(p: Point): string {
  return (
    "04" + p.x.toString(16).padStart(64, "0") + p.y.toString(16).padStart(64, "0")
  );
}

/**
 * Giải nén public key. p ≡ 3 (mod 4) nên căn bậc hai modular chỉ là
 * một phép luỹ thừa: y = ±(x³ + 7)^((p+1)/4).
 */
export function decompress(hex: string): Point {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  if (clean.length === 130 && clean.startsWith("04")) {
    const p = {
      x: BigInt("0x" + clean.slice(2, 66)),
      y: BigInt("0x" + clean.slice(66)),
    };
    if (!isOnCurve(p)) throw new Error("public key không nằm trên đường cong");
    return p;
  }
  if (clean.length !== 66 || (clean[1] !== "2" && clean[1] !== "3")) {
    throw new Error("public key nén phải là 33 byte, prefix 02 hoặc 03");
  }
  const x = BigInt("0x" + clean.slice(2));
  const alpha = mod(mod(x * x * x) + CURVE_B);
  let y = powMod(alpha, (P + 1n) / 4n);
  if (mod(y * y) !== alpha) throw new Error("x không phải hoành độ hợp lệ");
  const wantOdd = clean.startsWith("03");
  if (((y & 1n) === 1n) !== wantOdd) y = mod(-y);
  return { x, y };
}

/**
 * Đi bộ trên đường cong: trả hoành độ của `start + i·step` với i = 0..count−1,
 * cộng luôn điểm cuối `start + count·step`.
 *
 * Đây là primitive cho baby-step giant-step: tính n điểm liên tiếp chỉ với
 * 1 lần nghịch đảo modular (nhờ `batchInvert`). Hoành độ `null` = điểm vô cực.
 */
export function affineWalk(
  start: Point | null,
  step: Point,
  count: number,
): { xs: (bigint | null)[]; next: Point | null } {
  const Xs = new Array<bigint>(count);
  const Zs = new Array<bigint>(count);
  let acc: Jac = start === null ? JAC_ZERO : jacFromAffine(start);
  for (let i = 0; i < count; i++) {
    Xs[i] = acc.X;
    Zs[i] = acc.Z;
    acc = jacAddAffine(acc, step);
  }
  const invs = batchInvert(Zs);
  const xs = new Array<bigint | null>(count);
  for (let i = 0; i < count; i++) {
    if (Zs[i] === 0n) {
      xs[i] = null;
      continue;
    }
    const zi2 = mod(invs[i] * invs[i]);
    xs[i] = mod(Xs[i] * zi2);
  }
  return { xs, next: jacToAffine(acc) };
}
