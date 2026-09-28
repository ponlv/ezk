import { PuzzleList } from "@/components/PuzzleList";
import { getPuzzleRows, getPuzzleSet, pow2Label } from "@/lib/puzzles";

export const metadata = {
  title: "Puzzle",
  description:
    "200 ví Bitcoin xếp theo độ khó 1 → 200 bit, public key lộ hết. Bài toán: discrete log trong một khoảng đã biết.",
};

export default function PuzzlesPage() {
  const rows = getPuzzleRows();
  const { generatedAt } = getPuzzleSet();

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-rust-400">
          Puzzle
        </p>
        <h1 className="text-3xl font-bold text-zinc-50 sm:text-4xl">
          200 ví, từ 1 bit đến 200 bit
        </h1>
        <p className="max-w-3xl text-zinc-400">
          Một bộ puzzle tổ chức theo đúng luật của Bitcoin puzzle 2015: ví bậc{" "}
          <span className="font-mono text-zinc-300">n</span> có private key nằm
          trong khoảng{" "}
          <span className="font-mono text-zinc-300">[2ⁿ⁻¹, 2ⁿ − 1]</span>. Khác
          một điểm quyết định:{" "}
          <strong className="font-semibold text-zinc-200">
            public key của cả 200 ví đều đã lộ
          </strong>
          . Không còn phải dò khoá qua hàm hash — đây là bài discrete log trong
          một khoảng đã biết.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <RuleCard title="Khoảng khoá">
          Bậc <span className="font-mono">n</span> khoá đúng{" "}
          <span className="font-mono">n</span> bit: bit cao nhất luôn bật, nên
          không gian cần quét là{" "}
          <span className="font-mono text-zinc-300">2ⁿ⁻¹</span> khoá.
        </RuleCard>
        <RuleCard title="Public key lộ hết">
          Biết <span className="font-mono">Q = kG</span> và biết{" "}
          <span className="font-mono">k</span> nằm trong khoảng rộng{" "}
          <span className="font-mono">W</span> ⇒ kangaroo hoặc BSGS giải trong{" "}
          <span className="font-mono text-zinc-300">≈2√W</span> phép toán nhóm.
          Mất đúng một nửa số bit.
        </RuleCard>
        <RuleCard title="Giải được thì sao">
          Bấm <span className="font-mono">nhập khoá</span> ở bài tương ứng, dán
          private key vào. Trang tự tính{" "}
          <span className="font-mono">k·G</span> và so với public key đã công
          bố — khoá không rời khỏi máy bạn. Bài nào khớp thì được ghi lại làm
          tiến độ.
        </RuleCard>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-zinc-100">Danh sách</h2>
          <p className="font-mono text-xs text-zinc-600">
            sinh ngày {generatedAt} · {rows.length} ví
          </p>
        </div>
        <p className="max-w-3xl text-sm text-zinc-500">
          Cột <span className="text-zinc-400">Chi phí</span> là số phép toán
          nhóm kỳ vọng của Pollard kangaroo khi đã biết public key —{" "}
          <span className="font-mono text-zinc-400">2^((n−1)/2 + 1)</span>. Ví
          bậc 66 chỉ tốn {pow2Label(33.5)} phép; bậc 130 tốn {pow2Label(65.5)};
          bậc 200 tốn {pow2Label(100.5)}.
        </p>
        <PuzzleList rows={rows} />
      </section>

      <footer className="space-y-2 border-t border-zinc-800/80 pt-6 text-sm text-zinc-500">
        <p>
          Private key của 200 ví sinh bằng CSPRNG của hệ điều hành và giữ
          offline — không có trong repo, không có đường nào từ web chạm tới. Số
          dư các ví hiện tại là 0.
        </p>
        <p>
          Dữ liệu công khai nằm ở{" "}
          <code className="font-mono text-xs text-zinc-400">
            content/puzzles/wallets.json
          </code>
          . Tự kiểm tra một dòng: giải nén public key, xác nhận nó nằm trên
          secp256k1, băm{" "}
          <code className="font-mono text-xs text-zinc-400">
            RIPEMD160(SHA256(pubkey))
          </code>{" "}
          rồi base58check ra đúng address trong bảng.
        </p>
        <p>
          Tiến độ lưu bằng{" "}
          <code className="font-mono text-xs text-zinc-400">localStorage</code>{" "}
          của riêng trình duyệt này: không có server, không bảng xếp hạng, đổi
          máy là mất. Khoá nào tìm được thì tự lưu thêm ra chỗ khác.
        </p>
      </footer>
    </div>
  );
}

function RuleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5">
      <p className="mb-1.5 text-sm font-medium text-zinc-200">{title}</p>
      <p className="text-sm leading-relaxed text-zinc-500">{children}</p>
    </div>
  );
}
