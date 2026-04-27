import Link from "next/link";
import {
  getAllModules,
  getAllLessons,
  getPostsForModule,
} from "@/lib/content";

export const metadata = {
  title: "About",
  description:
    "Tôi là Pon Le, lập trình viên Go. Blog này ghi lại hành trình tôi học Rust và ZKP — hai thứ khó cùng một lúc.",
};

export default function AboutPage() {
  const modules = getAllModules();
  const lessons = getAllLessons();
  const totalLessons = lessons.length;
  const totalModules = modules.length;
  const moduleWithProgress =
    modules.find((m) => getPostsForModule(m.slug).length > 0) ?? null;
  const lastLesson = lessons[lessons.length - 1] ?? null;

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-rust-500/15 px-3 py-1 font-mono text-xs uppercase tracking-wider text-rust-300 ring-1 ring-rust-500/30">
            about
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 font-mono text-xs uppercase tracking-wider text-zinc-400">
            v0.1 · vẫn còn lem nhem
          </span>
        </div>
        <h1 className="text-balance text-4xl font-bold leading-tight text-zinc-50 sm:text-5xl">
          Một dev Go đang học Rust và ZKP cùng một lúc — và viết lại từng
          bước.
        </h1>
        <p className="max-w-3xl text-pretty text-lg leading-relaxed text-zinc-400">
          Tôi là <span className="text-zinc-200">Pon Le</span>. Hằng ngày tôi
          viết <span className="font-mono text-rust-300">Go</span>. Blog này
          tên <span className="font-mono text-rust-300">ezk</span> — có người
          đoán nó viết tắt của <em>"easy zk"</em>, sự thật trần trụi hơn: tôi
          gõ vội tên repo, "e + zk" — chữ "e" có thể là <em>explore</em>, có
          thể là <em>experiment</em>, có thể chẳng là gì. Cái tên ở lại vì
          tôi lười đổi.
        </p>
      </section>

      {/* 01 — Snapshot */}
      <Section number="01" label="Snapshot" title="Tôi đang ở đâu, ngay bây giờ">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Module" value={`${totalModules}`} note="6 giai đoạn" />
          <Stat
            label="Bài đã viết"
            value={`${totalLessons}`}
            note="đếm theo file MDX"
          />
          <Stat
            label="Đang học"
            value={
              moduleWithProgress
                ? `Giai đoạn ${moduleWithProgress.order
                    .toString()
                    .padStart(2, "0")}`
                : "—"
            }
            note={moduleWithProgress?.title ?? ""}
          />
        </div>
        <p className="text-sm text-zinc-400">
          Số liệu đọc trực tiếp từ thư mục{" "}
          <code className="font-mono text-rust-300">content/</code>, tự cập
          nhật khi tôi push bài mới.
        </p>
      </Section>

      {/* 02 — Background */}
      <Section
        number="02"
        label="Background"
        title="Tôi là dev Go — không phải Rust"
      >
        <p className="text-zinc-300">
          Đây là chỗ tôi muốn nói thẳng để không gây hiểu lầm:{" "}
          <strong>tôi không phải lập trình viên Rust</strong>. Hằng ngày tôi
          viết Go — backend service, CLI, vài lib internal. Rust với tôi cho
          đến đầu năm nay vẫn chỉ là thứ tôi gõ <code>cargo new</code> rồi
          xóa.
        </p>
        <p className="text-zinc-300">
          Khi tôi quyết định học ZKP, tôi đứng trước hai ngã:
        </p>
        <ul className="space-y-2 text-zinc-300">
          <Bullet>
            <strong className="text-zinc-100">Đường ngắn</strong> — học qua
            Circom + snarkjs, tích hợp Solidity. Cú pháp gọn, nhiều tutorial,
            an toàn cho người không biết Rust.
          </Bullet>
          <Bullet>
            <strong className="text-zinc-100">Đường dài</strong> — học qua
            Rust ecosystem (arkworks, halo2, plonky3, risc0). Phải học song
            song hai thứ khó. Nhưng đây là nơi mọi prover production
            (zkSync, Scroll, StarkNet, Polygon zkEVM) thực sự chạy.
          </Bullet>
        </ul>
        <p className="text-zinc-300">
          Tôi chọn đường dài. Vừa khó vì ZKP, vừa khó vì Rust. Mỗi bài bạn
          đọc trên blog này, tôi thường mất gấp đôi thời gian: một nửa cho
          toán/khái niệm ZK, một nửa để Rust compiler chấp nhận code của
          mình.
        </p>
        <Callout>
          <strong>Hệ quả</strong>: nếu bạn cũng từ Go (hoặc TS/Python) qua,
          một số đoạn tôi sẽ giải thích Rust kiểu "trait là interface có
          generic", "lifetime là cách compiler thay GC bằng kiểm tra static".
          Nó không hẳn đúng theo nghĩa hàn lâm, nhưng đủ để cảm — tôi tự
          dùng cách đó để qua được giai đoạn fight-the-borrow-checker.
        </Callout>
      </Section>

      {/* 03 — Why this blog */}
      <Section
        number="03"
        label="Why"
        title="Vì sao tôi viết blog này thay vì học âm thầm"
      >
        <p className="text-zinc-300">
          Tôi đã thử học ZKP <strong>bốn lần trước đây</strong>. Bỏ giữa
          chừng cả bốn. Lý do luôn giống: đọc paper, copy code, gật gù — đến
          lúc thực sự cần hiểu mới phát hiện mình không hiểu gì.
        </p>
        <p className="text-zinc-300">
          Lần này tôi đặt cược vào một quy tắc đơn giản:{" "}
          <strong className="text-zinc-100">viết ra mới được tính</strong>.
          Không viết được nghĩa là chưa hiểu. Đầu có thể tự lừa, ngón tay gõ
          phím thì không.
        </p>
        <p className="text-zinc-300">
          Mỗi tuần ít nhất một bài. Code có test. Bí ở đâu thì viết là bí.
          Nếu ai đó đọc và thấy chỗ tôi sai — vui lòng bảo. Đó là phần
          "public" trong "public learning".
        </p>
      </Section>

      {/* 04 — Currently struggling */}
      <Section
        number="04"
        label="Now"
        title="Đang vật lộn với"
      >
        <div className="rounded-2xl border border-rust-500/30 bg-rust-500/5 p-6 sm:p-8">
          <p className="text-lg leading-relaxed text-zinc-200">
            Chứng minh tính kết hợp{" "}
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-rust-300">
              (P + Q) + R = P + (Q + R)
            </code>{" "}
            trên elliptic curve mà không phải tin định lý. Hai tuần rồi vẫn
            chưa thông một cách thật sự. Có lẽ cần đến divisor theory — hoặc
            tôi sẽ chấp nhận tin trước, hiểu sau.
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            Bài cập nhật mới nhất:{" "}
            {lastLesson ? (
              <Link
                href={`/modules/${lastLesson.moduleSlug}/${lastLesson.postSlug}`}
                className="text-rust-400 underline-offset-4 hover:underline"
              >
                {lastLesson.postTitle}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
      </Section>

      {/* 05 — Structure of a lesson */}
      <Section
        number="05"
        label="How"
        title="Cấu trúc một bài viết"
      >
        <p className="text-zinc-300">
          Mỗi bài có <strong className="text-zinc-100">ba lát</strong>, theo
          thứ tự cố định:
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Slice
            tag="01"
            title="Khái niệm"
            body="Định nghĩa, intuition, ví dụ cụ thể bằng số nhỏ. Mục tiêu: bạn cảm được trước khi gặp ký hiệu."
          />
          <Slice
            tag="02"
            title="Chứng minh"
            body="Cố không skip phần khó. Proof là chỗ 'magic' biến mất — nếu skip, bạn lại quay về copy code mà không hiểu."
          />
          <Slice
            tag="03"
            title="Code Rust"
            body="Bài tập gõ theo, có test. Mục tiêu: cargo test xanh là bạn thực sự đã hiểu, không phải đọc lướt."
          />
        </div>
        <p className="text-sm text-zinc-400">
          Tôi viết bằng tiếng Việt vì đó là tiếng mẹ đẻ và tôi nghĩ nhanh
          hơn. Thuật ngữ chuyên môn (commitment, soundness, generator, ...)
          tôi giữ nguyên tiếng Anh — dịch ra hay rối.
        </p>
      </Section>

      {/* 06 — Expectations */}
      <Section
        number="06"
        label="Expectations"
        title="Blog này LÀ gì — và KHÔNG là gì"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="Là" tone="positive">
            <ul className="space-y-2 text-sm text-zinc-300">
              <Bullet>Sổ tay người học, công khai và còn lem nhem.</Bullet>
              <Bullet>Code có test, chạy được, không phải pseudo-code.</Bullet>
              <Bullet>Toán có chứng minh, cố không skip phần khó.</Bullet>
              <Bullet>
                Có chỗ tôi thừa nhận <em>"tôi đang bí ở đây"</em>.
              </Bullet>
            </ul>
          </Panel>
          <Panel title="Không" tone="negative">
            <ul className="space-y-2 text-sm text-zinc-300">
              <Bullet>
                Tutorial chính quy — có chỗ tôi sẽ viết lại sau vài tuần.
              </Bullet>
              <Bullet>
                Production reference — code ưu tiên dễ hiểu hơn nhanh.
              </Bullet>
              <Bullet>
                Tổng hợp tin tức ZK — đã có hàng trăm blog làm việc đó tốt
                hơn.
              </Bullet>
              <Bullet>Đã hoàn thành — tôi vẫn đang đi.</Bullet>
            </ul>
          </Panel>
        </div>
      </Section>

      {/* 07 — Reading paths */}
      <Section
        number="07"
        label="Start here"
        title="Bạn nên đọc theo thứ tự nào"
      >
        <div className="space-y-3">
          <Path
            level="Lần đầu nghe ZK"
            note="Đi tuần tự từ bài giới thiệu — mỗi bài có nút 'Tiếp' cuối trang."
            href="/modules/01-toan-hoc-nen-tang/00-bat-dau-tu-dau"
            cta="Bắt đầu →"
          />
          <Path
            level="Đã quen toán đại số tuyến tính / abstract algebra"
            note="Skip thẳng vào group theory hoặc polynomial commitment."
            href="/modules/01-toan-hoc-nen-tang/03-group-theory"
            cta="Đến group theory →"
          />
          <Path
            level="Chỉ muốn xem code Rust"
            note="Mỗi bài có section 'Bài tập Rust' ở cuối — gõ vào cargo new là chạy được."
            href="/modules/01-toan-hoc-nen-tang/02-finite-field-fp"
            cta="Đến Fp implementation →"
          />
        </div>
      </Section>

      {/* 08 — Contact */}
      <Section number="08" label="Contact" title="Liên hệ">
        <dl className="grid gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
          <dt className="text-zinc-500">Tên</dt>
          <dd className="text-zinc-200">Pon Le</dd>
          <dt className="text-zinc-500">Email</dt>
          <dd>
            <a
              href="mailto:levanpon1009@gmail.com"
              className="text-rust-400 underline-offset-4 hover:underline"
            >
              levanpon1009@gmail.com
            </a>
          </dd>
          <dt className="text-zinc-500">Daily stack</dt>
          <dd className="text-zinc-200">Go (Golang) · backend / CLI</dd>
          <dt className="text-zinc-500">Đang học</dt>
          <dd className="text-zinc-200">Rust · ZKP · arkworks</dd>
          <dt className="text-zinc-500">Chấp nhận</dt>
          <dd className="text-zinc-200">
            Góp ý, sửa lỗi toán, tranh luận cách trình bày. Không spam.
          </dd>
        </dl>
      </Section>
    </div>
  );
}

/* ----- helpers ----- */

function Section({
  number,
  label,
  title,
  children,
}: {
  number: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 border-t border-zinc-800 pt-10">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-rust-400">{number}</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          {label}
        </span>
      </div>
      <h2 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-50">{value}</p>
      {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "positive" | "negative";
  children: React.ReactNode;
}) {
  const cls =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-zinc-700 bg-zinc-900/40";
  const titleCls =
    tone === "positive" ? "text-emerald-300" : "text-zinc-400";
  return (
    <div className={`rounded-xl border p-6 ${cls}`}>
      <h3
        className={`mb-3 font-mono text-xs uppercase tracking-wider ${titleCls}`}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
      <span>{children}</span>
    </li>
  );
}

function Slice({
  tag,
  title,
  body,
}: {
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="font-mono text-xs text-rust-400">{tag}</p>
      <p className="mt-1 text-base font-semibold text-zinc-50">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function Path({
  level,
  note,
  href,
  cta,
}: {
  level: string;
  note: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-rust-500/40 hover:bg-zinc-900/80"
    >
      <div>
        <p className="text-sm font-medium text-zinc-100">{level}</p>
        <p className="mt-1 text-sm text-zinc-400">{note}</p>
      </div>
      <span className="shrink-0 text-sm text-rust-400 group-hover:underline">
        {cta}
      </span>
    </Link>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm leading-relaxed text-sky-100">
      {children}
    </aside>
  );
}
