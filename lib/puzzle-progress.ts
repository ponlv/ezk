/**
 * Tiến độ giải puzzle — lưu trong `localStorage` của trình duyệt.
 *
 * Hoàn toàn cục bộ: không có server, không đồng bộ giữa máy, không ai thấy
 * ngoài chính người giải. Xoá dữ liệu site là mất tiến độ (nhưng private key
 * tìm được thì vẫn nên tự lưu ra chỗ khác).
 *
 * Mọi thao tác đọc/ghi đều bọc try/catch: ở chế độ ẩn danh hoặc khi site data
 * bị chặn, `localStorage` có thể throw ngay lúc truy cập.
 */

const STORAGE_KEY = "ezk:puzzle-solved";

export interface SolvedEntry {
  /** Private key đã xác minh, hex 64 ký tự */
  privHex: string;
  /** Thời điểm xác minh, ISO string */
  at: string;
}

/** bậc bit (dạng string, vì key của JSON object luôn là string) → đáp án */
export type SolvedMap = Record<string, SolvedEntry>;

function isEntry(value: unknown): value is SolvedEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<SolvedEntry>;
  return (
    typeof entry.privHex === "string" &&
    /^[0-9a-f]{64}$/.test(entry.privHex) &&
    typeof entry.at === "string"
  );
}

export function loadProgress(): SolvedMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const out: SolvedMap = {};
    for (const [bits, entry] of Object.entries(parsed)) {
      if (/^\d+$/.test(bits) && isEntry(entry)) out[bits] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveProgress(map: SolvedMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // hết quota hoặc bị chặn — tiến độ chỉ còn trong phiên này
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // không làm gì được thêm
  }
}
