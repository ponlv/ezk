import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import Link from "next/link";
import type { ComponentProps } from "react";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: "github-dark-dimmed",
  keepBackground: false,
  defaultLang: { block: "rust", inline: "rust" },
};

const components: MDXRemoteProps["components"] = {
  a: ({ href = "#", children, ...rest }: ComponentProps<"a">) => {
    const isExternal = href.startsWith("http");
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-rust-400 underline-offset-4 hover:underline"
          {...rest}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className="text-rust-400 underline-offset-4 hover:underline">
        {children}
      </Link>
    );
  },
  Callout: ({
    type = "info",
    title,
    children,
  }: {
    type?: "info" | "warn" | "tip";
    title?: string;
    children: React.ReactNode;
  }) => {
    const styles = {
      info: "border-sky-500/40 bg-sky-500/5 text-sky-100",
      warn: "border-amber-500/40 bg-amber-500/5 text-amber-100",
      tip: "border-emerald-500/40 bg-emerald-500/5 text-emerald-100",
    }[type];
    return (
      <aside className={`my-6 rounded-lg border px-4 py-3 ${styles}`}>
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div className="text-sm leading-relaxed [&_p:last-child]:mb-0">
          {children}
        </div>
      </aside>
    );
  },
};

export function Mdx({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [
            rehypeSlug,
            [rehypePrettyCode, prettyCodeOptions],
            [
              rehypeKatex,
              {
                strict: false,
                throwOnError: false,
                output: "html",
              },
            ],
            [
              rehypeAutolinkHeadings,
              {
                behavior: "append",
                properties: { className: ["anchor"], ariaLabel: "Anchor" },
                content: { type: "text", value: "#" },
              },
            ],
          ],
        },
      }}
    />
  );
}
