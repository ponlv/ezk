import Link from "next/link";
import type { ModuleMeta } from "@/lib/content";

export function ModuleCard({
  module,
  postCount,
}: {
  module: ModuleMeta;
  postCount: number;
}) {
  return (
    <Link
      href={`/modules/${module.slug}`}
      className="group relative block rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-rust-500/50 hover:bg-zinc-900/80"
    >
      <div className="mb-3">
        <span className="font-mono text-xs text-zinc-500">
          Giai đoạn {module.order.toString().padStart(2, "0")}
        </span>
      </div>

      <h3 className="mb-1 text-xl font-semibold text-zinc-50 transition group-hover:text-rust-300">
        {module.title}
      </h3>
      {module.subtitle && (
        <p className="mb-3 text-sm text-zinc-400">{module.subtitle}</p>
      )}

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
        {module.summary}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {module.tools.slice(0, 4).map((tool) => (
          <span
            key={tool}
            className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300"
          >
            {tool}
          </span>
        ))}
        {module.tools.length > 4 && (
          <span className="rounded-md px-1.5 py-0.5 text-[11px] text-zinc-500">
            +{module.tools.length - 4}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
        <span>{module.duration}</span>
        <span>
          {postCount} {postCount === 1 ? "bài" : "bài viết"}
        </span>
      </div>
    </Link>
  );
}
