/**
 * secp256k1 thuần BigInt — không phụ thuộc thư viện ngoài.
 *
 * Dùng ở CẢ hai phía: server (script sinh ví) và client (kiểm tra private key
 * người dùng nhập, ngay trong máy họ). Vì vậy file này KHÔNG import
 * `node:crypto` hay bất cứ thứ gì server-only.
 *
 * Cảnh báo: code học tập — không constant-time, không chống side-channel.
 * Đừng dùng để giữ tiền thật.
 *
 * Toạ độ Jacobian `(X, Y, Z)` biểu diễn điểm affine `(X/Z², Y/Z³)`, với `Z = 0`
 * là điểm vô cực. Lý do dùng Jacobian: cộng và nhân đôi không cần nghịch đảo
 * modular (rất đắt), chỉ cần đúng một lần ở bước cuối khi về affine.
 */

/** Đặc số của field: p = 2²⁵⁶ − 2³² − 977 */
export const P =
  0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;

/** Bậc của nhóm sinh bởi G */
export const N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

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

interface Jac {
  X: bigint;
  Y: bigint;
  Z: bigint;
}

const JAC_ZERO: Jac = { X: 0n, Y: 1n, Z: 0n };

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
  if (p.Z === 0n) return { X: q.x, Y: q.y, Z: 1n };
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

/** Public key nén: prefix 02 (y chẵn) hoặc 03 (y lẻ) + 32 byte hoành độ */
export function compress(p: Point): string {
  const prefix = (p.y & 1n) === 0n ? "02" : "03";
  return prefix + p.x.toString(16).padStart(64, "0");
}
