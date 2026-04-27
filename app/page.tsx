import Link from "next/link";
import { ModuleCard } from "@/components/ModuleCard";
import { getAllModules, getPostsForModule } from "@/lib/content";

export default function HomePage() {
  const modules = getAllModules();
  const postCounts = Object.fromEntries(
    modules.map((m) => [m.slug, getPostsForModule(m.slug).length]),
  );

  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-rust-500/15 px-3 py-1 font-mono text-xs uppercase tracking-wider text-rust-300 ring-1 ring-rust-500/30">
            zero → hero
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 font-mono text-xs uppercase tracking-wider text-zinc-400">
            rust ecosystem
          </span>
        </div>

        <h1 className="text-balance text-4xl font-bold leading-tight text-zinc-50 sm:text-5xl">
          Học{" "}
          <span className="bg-gradient-to-r from-rust-400 to-amber-300 bg-clip-text text-transparent">
            Zero-Knowledge Proofs
          </span>{" "}
          từ con số 0, lập trình bằng Rust.
        </h1>

        <p className="max-w-3xl text-pretty text-lg leading-relaxed text-zinc-400">
          Đây là blog tôi viết để ép bản thân học có hệ thống. Mỗi giai đoạn là
          một module — toán, fundamentals, arithmetization, modern proof
          systems, arkworks, blockchain. Bài viết là ghi chú, code thử, và những
          chỗ tôi đã loay hoay lâu nhất.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/modules"
            className="rounded-md bg-rust-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-rust-400"
          >
            Xem toàn bộ lộ trình →
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            Vì sao có blog này
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">
            Lộ trình 6 giai đoạn
          </h2>
          <Link
            href="/modules"
            className="text-sm text-rust-400 hover:underline"
          >
            Tất cả →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((module) => (
            <ModuleCard
              key={module.slug}
              module={module}
              postCount={postCounts[module.slug] ?? 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
