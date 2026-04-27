/**
 * Playlist YouTube cho music player.
 *
 * Cách thêm bài:
 *  - Copy URL YouTube (dạng watch?v=..., youtu.be/..., hoặc /embed/...).
 *  - Thêm entry vào mảng `playlist` bên dưới với url + title.
 *  - Player tự extract video ID và load qua YouTube IFrame Player API.
 *
 * Lưu ý:
 *  - Chỉ hoạt động với video YouTube cho phép embed (đa số là cho phép).
 *  - Nếu video bị disabled embed, iframe sẽ báo lỗi — bỏ qua, chuyển bài khác.
 *  - Hợp pháp 100%: dùng player chính thức của YouTube qua iframe API,
 *    không bypass quảng cáo, không strip branding.
 */

export interface YouTubeTrack {
  /** Tiêu đề hiển thị trong player */
  title: string;
  /** Tên kênh / artist (tuỳ chọn) */
  artist?: string;
  /** Link YouTube — bất kỳ định dạng nào: watch?v=..., youtu.be/..., /embed/... */
  url: string;
}

export const playlist: YouTubeTrack[] = [
  {
    title: "Nhạc Thiền Phật Giáo - Bát Nhã Diệu Tâm | An nhiên & Giác ngộ",
    artist: "Nhạc Thiền Phật Giáo",
    url: "https://www.youtube.com/watch?v=yO5xkFovXMY&list=RDyO5xkFovXMY&start_radio=1&t=1s",
  },
  {
    title: "Nhạc Thiền Phật Giáo - Bát Nhã Diệu Tâm | An nhiên & Giác ngộ",
    artist: "Nhạc Thiền Phật Giáo",
    url: "https://www.youtube.com/watch?v=vch84qG9XeU&list=RDvch84qG9XeU&start_radio=1",
  }
  // Thêm bài của bạn ở đây — paste URL YouTube và title.
];

/**
 * Extract YouTube video ID từ mọi định dạng URL phổ biến.
 * Trả về null nếu không parse được (player sẽ skip track).
 */
export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    // youtube.com/watch?v=VIDEO_ID
    if (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "m.youtube.com" ||
      u.hostname === "music.youtube.com"
    ) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // youtube.com/embed/VIDEO_ID hoặc /shorts/VIDEO_ID hoặc /live/VIDEO_ID
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL — fallthrough */
  }
  return null;
}
