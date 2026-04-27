import { ModuleCard } from "@/components/ModuleCard";
import { getAllModules, getPostsForModule } from "@/lib/content";

export const metadata = {
  title: "Tất cả modules",
  description: "Lộ trình 6 giai đoạn học ZKP với Rust.",
};

export default function ModulesPage() {
  const modules = getAllModules();
  const postCounts = Object.fromEntries(
    modules.map((m) => [m.slug, getPostsForModule(m.slug).length]),
  );

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-rust-400">
          Roadmap
        </p>
        <h1 className="text-3xl font-bold text-zinc-50 sm:text-4xl">
          Lộ trình học ZKP với Rust
        </h1>
        <p className="max-w-3xl text-zinc-400">
          Sáu giai đoạn, đi từ toán nền tảng đến deploy zk-rollup. Mỗi module
          gắn với một bộ công cụ Rust cụ thể trong arkworks ecosystem.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <ModuleCard
            key={module.slug}
            module={module}
            postCount={postCounts[module.slug] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
