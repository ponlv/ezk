import Link from "next/link";
import { notFound } from "next/navigation";
import { Mdx } from "@/lib/mdx";
import { TableOfContents } from "@/components/TableOfContents";
import {
  getAllLessons,
  getAllModules,
  getLessonNeighbors,
  getModule,
  getPost,
  getPostsForModule,
} from "@/lib/content";

interface Props {
  params: Promise<{ slug: string; post: string }>;
}

export async function generateStaticParams() {
  const modules = getAllModules();
  return modules.flatMap((m) =>
    getPostsForModule(m.slug).map((p) => ({ slug: m.slug, post: p.slug })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug, post } = await params;
  const data = getPost(slug, post);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug, post } = await params;
  const module = getModule(slug);
  const data = getPost(slug, post);
  if (!module || !data) notFound();

  const { prev, next } = getLessonNeighbors(slug, post);
  const allLessons = getAllLessons();
  const totalLessons = allLessons.length;
  const currentIdx = allLessons.findIndex(
    (l) => l.moduleSlug === slug && l.postSlug === post,
  );
  const lessonNumber = currentIdx + 1;

  return (
    <article className="space-y-10">
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/modules" className="hover:text-rust-400">
          Modules
        </Link>
        <span>/</span>
        <Link href={`/modules/${module.slug}`} className="hover:text-rust-400">
          {module.title}
        </Link>
      </nav>

      <header className="space-y-3 border-b border-zinc-800 pb-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="rounded-full bg-rust-500/15 px-2.5 py-0.5 font-mono text-rust-300 ring-1 ring-rust-500/30">
            Bài {lessonNumber}/{totalLessons}
          </span>
          {data.date && <time className="font-mono">{data.date}</time>}
          <span>·</span>
          <span>{data.readingTime}</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-50 sm:text-4xl">
          {data.title}
        </h1>
        {data.description && (
          <p className="text-lg text-zinc-400">{data.description}</p>
        )}
        {data.tags.length > 0 && (
          <div className="flex gap-1.5 pt-2">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/*
        TOC component tự handle layout theo viewport:
        - <1440px: collapsible card in-flow ở đây (giữa header và content).
        - ≥1440px: fixed sidebar bên trái viewport, không chiếm chỗ trong flow.
        Nhờ vậy content giữ nguyên max-w-5xl như ban đầu, không bị grid shrink.
      */}
      <TableOfContents headings={data.headings} />

      <div className="prose prose-invert prose-zinc max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-xl prose-a:text-rust-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-zinc-100 prose-code:text-rust-300 prose-pre:bg-transparent prose-pre:p-0 prose-li:my-1">
        <Mdx source={data.content} />
      </div>

      <nav className="grid gap-3 border-t border-zinc-800 pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/modules/${prev.moduleSlug}/${prev.postSlug}`}
            className="group rounded-lg border border-zinc-800 px-4 py-3 transition hover:border-rust-500/40"
          >
            <div className="text-xs text-zinc-500">← Bài trước</div>
            <div className="text-sm font-medium text-zinc-200 group-hover:text-rust-300">
              {prev.postTitle}
            </div>
            {prev.moduleSlug !== slug && (
              <div className="mt-0.5 text-[11px] text-zinc-500">
                {prev.moduleTitle}
              </div>
            )}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/modules/${next.moduleSlug}/${next.postSlug}`}
            className="group rounded-lg border border-zinc-800 px-4 py-3 text-right transition hover:border-rust-500/40 sm:col-start-2"
          >
            <div className="text-xs text-zinc-500">Bài tiếp →</div>
            <div className="text-sm font-medium text-zinc-200 group-hover:text-rust-300">
              {next.postTitle}
            </div>
            {next.moduleSlug !== slug && (
              <div className="mt-0.5 text-[11px] text-zinc-500">
                Sang module: {next.moduleTitle}
              </div>
            )}
          </Link>
        ) : (
          <span className="sm:col-start-2" />
        )}
      </nav>
    </article>
  );
}
