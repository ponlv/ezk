import Link from "next/link";
import type { PostMeta } from "@/lib/content";

export function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-10 text-center text-sm text-zinc-500">
        Chưa có bài viết. Sẽ sớm cập nhật.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-xl border border-zinc-800">
      {posts.map((post, idx) => (
        <li key={post.slug}>
          <Link
            href={`/modules/${post.moduleSlug}/${post.slug}`}
            className="group flex gap-4 px-5 py-4 transition hover:bg-zinc-900/60"
          >
            <span className="mt-0.5 shrink-0 font-mono text-sm text-zinc-600">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <h4 className="text-base font-medium text-zinc-100 transition group-hover:text-rust-300">
                  {post.title}
                </h4>
                <time className="shrink-0 font-mono text-xs text-zinc-500">
                  {post.date}
                </time>
              </div>
              {post.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {post.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>{post.readingTime}</span>
                {post.tags.length > 0 && (
                  <>
                    <span>·</span>
                    <div className="flex gap-1.5">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
