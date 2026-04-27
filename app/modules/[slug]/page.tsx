import Link from "next/link";
import { notFound } from "next/navigation";
import { PostList } from "@/components/PostList";
import {
  getAllModules,
  getModule,
  getPostsForModule,
} from "@/lib/content";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllModules().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const module = getModule(slug);
  if (!module) return {};
  return {
    title: module.title,
    description: module.summary,
  };
}

export default async function ModuleDetailPage({ params }: Props) {
  const { slug } = await params;
  const module = getModule(slug);
  if (!module) notFound();

  const posts = getPostsForModule(slug);
  const firstPost = posts[0] ?? null;

  return (
    <article className="space-y-12">
      <header className="space-y-4 border-b border-zinc-800 pb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-rust-400">
            Giai đoạn {module.order.toString().padStart(2, "0")}
          </span>
          <span className="text-sm text-zinc-500">· {module.duration}</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-50 sm:text-4xl">
          {module.title}
        </h1>
        {module.subtitle && (
          <p className="text-lg text-zinc-300">{module.subtitle}</p>
        )}
        <p className="max-w-3xl text-zinc-400">{module.summary}</p>

        {firstPost && (
          <div className="pt-2">
            <Link
              href={`/modules/${slug}/${firstPost.slug}`}
              className="inline-flex items-center gap-2 rounded-md bg-rust-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-rust-400"
            >
              Bắt đầu bài đầu tiên: {firstPost.title} →
            </Link>
          </div>
        )}
      </header>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Trọng tâm
          </h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            {module.topics.map((topic) => (
              <li key={topic} className="flex gap-2">
                <span className="text-rust-500">▸</span>
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Công cụ Rust
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {module.tools.map((tool) => (
              <span
                key={tool}
                className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-rust-300"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {module.resources.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Tài liệu
          </h2>
          <ul className="space-y-1.5 text-sm">
            {module.resources.map((r) => (
              <li key={r.title} className="text-zinc-300">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-rust-400 hover:underline"
                  >
                    {r.title}
                  </a>
                ) : (
                  <span>{r.title}</span>
                )}
                {r.note && (
                  <span className="ml-2 text-zinc-500">— {r.note}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-zinc-100">
          Danh sách bài học ({posts.length})
        </h2>
        <PostList posts={posts} />
      </section>
    </article>
  );
}
