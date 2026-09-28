# ezk

Blog hành trình **Zero → Hero ZKP với Rust**. Next.js 15 (App Router) + MDX +
Tailwind. Nội dung viết bằng MDX, tổ chức theo module học.

## Cấu trúc

```
ezk/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Trang chủ (roadmap overview)
│   ├── modules/
│   │   ├── page.tsx        # Danh sách modules
│   │   └── [slug]/
│   │       ├── page.tsx    # Chi tiết module
│   │       └── [post]/
│   │           └── page.tsx  # Chi tiết bài viết
│   ├── puzzles/page.tsx    # Tab Puzzle: 200 ví 1→200 bit
│   └── about/page.tsx
├── components/             # ModuleCard, PostList, ProgressBar
├── content/
│   └── modules/
│       ├── 01-toan-hoc-nen-tang/
│       │   ├── _meta.json   # metadata module
│       │   └── *.mdx        # bài viết
│       ├── 02-zk-fundamentals/
│       ├── 03-arithmetization/
│       ├── 04-modern-proof-systems/
│       ├── 05-arkworks-thuc-te/
│       └── 06-blockchain-ung-dung/
├── content/puzzles/
│   └── wallets.json        # dữ liệu PUBLIC của bộ puzzle
├── scripts/
│   └── generate-puzzles.mts  # sinh 200 ví (chạy một lần)
└── lib/
    ├── content.ts          # đọc modules + posts từ filesystem
    ├── mdx.tsx             # render MDX với rehype-pretty-code
    ├── secp256k1.ts        # EC thuần BigInt, dùng cả server lẫn client
    ├── btc-address.ts      # hash160 + base58check → address P2PKH
    ├── puzzles.ts          # đọc wallets.json
    ├── puzzle-check.ts     # kiểm tra private key người giải nhập
    └── puzzle-progress.ts  # lưu tiến độ vào localStorage
```

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Viết bài mới

1. Tạo file `.mdx` mới trong `content/modules/<module-slug>/`.
2. Frontmatter bắt buộc:

   ```yaml
   ---
   title: "Tiêu đề"
   description: "Mô tả ngắn"
   date: "2026-04-27"
   tags: ["rust", "finite-fields"]
   draft: false
   ---
   ```

3. Sắp xếp theo `date` (mới nhất lên đầu). Đặt `draft: true` để giấu khỏi
   danh sách public.

## Cập nhật trạng thái module

Sửa `_meta.json` của module:

- `status`: `"planned"` | `"in-progress"` | `"completed"`
- `topics`, `tools`, `resources` cập nhật khi học sâu hơn.

Progress bar trên trang chủ tự cập nhật.

## Components MDX có sẵn

```mdx
<Callout type="info" title="Note">Nội dung</Callout>
<Callout type="warn" title="Cẩn thận">...</Callout>
<Callout type="tip" title="Mẹo">...</Callout>
```

## Tab Puzzle

200 ví Bitcoin xếp theo độ khó: ví bậc `n` có private key trong
`[2^(n-1), 2^n - 1]` — đúng luật Bitcoin puzzle 2015. Khác biệt: **public key
của cả 200 ví đều công bố**, nên đây là bài discrete log trong khoảng đã biết,
giải bằng BSGS / Pollard kangaroo với `≈2^((n-1)/2)` phép toán nhóm thay vì
`2^(n-1)` phép dò khoá.

**Hai file dữ liệu**:

| File | Nội dung | Git |
| --- | --- | --- |
| `content/puzzles/wallets.json` | bậc, khoảng khoá, public key, address | commit |
| `.secrets/puzzle-keys.json` | thêm private key, `chmod 600` | **gitignore** |

Trang `/puzzles` chỉ đọc file public. Không có đường nào từ web tới private key.

**Sinh lại bộ ví** (chỉ khi chưa công bố — chạy lại là huỷ toàn bộ puzzle cũ):

```bash
npm run gen:puzzles           # từ chối nếu file đã tồn tại
npm run gen:puzzles -- --force  # ghi đè, sinh khoá mới
```

Khoá lấy từ CSPRNG của OS (`crypto.randomBytes` + rejection sampling). Backup
`.secrets/puzzle-keys.json` ra chỗ an toàn trước khi nạp BTC vào bất kỳ ví nào —
mất file là mất ví.

**Nút "nhập khoá"**: người giải dán private key (hex hoặc thập phân), trang tính
`k·G` rồi so với public key đã công bố — chạy hoàn toàn trong trình duyệt họ,
khoá không gửi đi đâu. Bài nào khớp thì ghi vào `localStorage`
(`ezk:puzzle-solved`): tiến độ theo từng máy, không có server, không xếp hạng.
Khoá lưu trong `localStorage` được xác minh lại mỗi lần tải trang, nên sửa tay
để "ăn gian" sẽ bị loại.

## Stack

- Next.js 15 (App Router, RSC)
- TypeScript strict
- Tailwind 3 + `@tailwindcss/typography`
- `next-mdx-remote/rsc` + `rehype-pretty-code` (Shiki)
- `gray-matter` cho frontmatter
- `reading-time` để ước lượng thời gian đọc

## Nhạc nền (YouTube music player)

Player nổi ở góc dưới phải, hoạt động trên mọi trang. Phát qua **YouTube
IFrame Player API** chính thức — hợp lệ với ToS YouTube. Trạng thái (track
đang chọn, volume, đóng/mở) lưu `localStorage` qua refresh.

**Thêm bài**: mở [`lib/playlist.ts`](lib/playlist.ts), thêm entry:

```ts
{
  title: "lofi hip hop radio — beats to relax/study to",
  artist: "Lofi Girl",
  url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
}
```

URL chấp nhận mọi định dạng:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/live/VIDEO_ID`

Player tự extract video ID. Nếu video nào disable embed (hiếm), iframe sẽ
báo lỗi — bấm next để bỏ qua.

**Vài kênh nhạc nền học bài hợp pháp embed**:

- [Lofi Girl](https://www.youtube.com/@LofiGirl) — lofi hip hop / synthwave 24/7
- [Chillhop Music](https://www.youtube.com/@ChillhopMusic) — jazzy chill beats
- [Cafe Music BGM channel](https://www.youtube.com/@cafemusicbgmchannel) — jazz / piano cafe
- [The Jazz Hop Café](https://www.youtube.com/@TheJazzHopCafe)

Tránh paste link nhạc bản quyền cá nhân (vd: bài hát commercial trên kênh
artist) — đa số chặn embed.
