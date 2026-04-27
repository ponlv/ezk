import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import readingTime from "reading-time";

export interface ModuleMeta {
  slug: string;
  order: number;
  title: string;
  subtitle?: string;
  duration: string;
  summary: string;
  topics: string[];
  tools: string[];
  resources: { title: string; url?: string; note?: string }[];
}

export interface PostMeta {
  slug: string;
  moduleSlug: string;
  order: number;
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft: boolean;
  readingTime: string;
}

export interface LessonRef {
  moduleSlug: string;
  moduleTitle: string;
  moduleOrder: number;
  postSlug: string;
  postTitle: string;
  postOrder: number;
}

export interface Heading {
  /** ID khớp với `rehype-slug` để anchor link nhảy đúng tới heading */
  id: string;
  /** Text đã clean (không còn `**bold**`, `$math$`, ...) */
  text: string;
  /** 2 = ##, 3 = ### */
  level: 2 | 3;
}

export interface Post extends PostMeta {
  content: string;
  headings: Heading[];
}

/**
 * Extract h2 + h3 headings từ raw MDX để build Table of Contents.
 * Mục tiêu: slug ra trùng với `rehype-slug` (cùng dùng github-slugger).
 *
 * Quy trình:
 *  1. Skip code blocks (giữa cặp ```).
 *  2. Match dòng bắt đầu bằng `## ` hoặc `### `.
 *  3. Clean markdown emphasis + `$math$` + `[link](url)` để text giống
 *     hệt với cái mà rehype-slug "thấy" sau khi rendering.
 *  4. Slug bằng github-slugger (cùng instance dùng trong rehype-slug).
 */
export function extractHeadings(mdx: string): Heading[] {
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();
  const lines = mdx.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;

    const level = m[1].length as 2 | 3;
    const text = m[2]
      .replace(/\$([^$]+)\$/g, "$1") // $math$ → math
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
      .replace(/`([^`]+)`/g, "$1") // `code` → code
      .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** → bold
      .replace(/\*([^*]+)\*/g, "$1") // *italic* → italic
      .replace(/_([^_]+)_/g, "$1") // _italic_ → italic
      .trim();

    headings.push({ id: slugger.slug(text), text, level });
  }

  return headings;
}

const CONTENT_ROOT = path.join(process.cwd(), "content");
const MODULES_DIR = path.join(CONTENT_ROOT, "modules");

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function getAllModules(): ModuleMeta[] {
  if (!fs.existsSync(MODULES_DIR)) return [];

  const dirs = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const modules = dirs
    .map((dir) => {
      const metaPath = path.join(MODULES_DIR, dir, "_meta.json");
      if (!fs.existsSync(metaPath)) return null;
      const meta = readJson<Omit<ModuleMeta, "slug">>(metaPath);
      return { slug: dir, ...meta };
    })
    .filter((m): m is ModuleMeta => m !== null)
    .sort((a, b) => a.order - b.order);

  return modules;
}

export function getModule(slug: string): ModuleMeta | null {
  const metaPath = path.join(MODULES_DIR, slug, "_meta.json");
  if (!fs.existsSync(metaPath)) return null;
  const meta = readJson<Omit<ModuleMeta, "slug">>(metaPath);
  return { slug, ...meta };
}

export function getPostsForModule(moduleSlug: string): PostMeta[] {
  const moduleDir = path.join(MODULES_DIR, moduleSlug);
  if (!fs.existsSync(moduleDir)) return [];

  const files = fs
    .readdirSync(moduleDir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));

  const posts = files
    .map((file) => {
      const fullPath = path.join(moduleDir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.mdx$/, "");
      const stats = readingTime(content);
      return {
        slug,
        moduleSlug,
        order: typeof data.order === "number" ? data.order : 999,
        title: data.title ?? slug,
        description: data.description ?? "",
        date: data.date ?? "",
        tags: data.tags ?? [],
        draft: data.draft ?? false,
        readingTime: stats.text,
      } satisfies PostMeta;
    })
    .filter((p) => !p.draft)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.date < b.date ? -1 : 1;
    });

  return posts;
}

export function getPost(moduleSlug: string, postSlug: string): Post | null {
  const fullPath = path.join(MODULES_DIR, moduleSlug, `${postSlug}.mdx`);
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  return {
    slug: postSlug,
    moduleSlug,
    order: typeof data.order === "number" ? data.order : 999,
    title: data.title ?? postSlug,
    description: data.description ?? "",
    date: data.date ?? "",
    tags: data.tags ?? [],
    draft: data.draft ?? false,
    readingTime: stats.text,
    content,
    headings: extractHeadings(content),
  };
}

export function getAllPosts(): PostMeta[] {
  const modules = getAllModules();
  return modules.flatMap((m) => getPostsForModule(m.slug));
}

/**
 * Returns every lesson across every module in learning order:
 * sort by module.order, then post.order. Used for cross-module
 * prev/next navigation so the reader walks the whole roadmap as
 * one continuous chain.
 */
export function getAllLessons(): LessonRef[] {
  const modules = getAllModules();
  const chain: LessonRef[] = [];
  for (const m of modules) {
    const posts = getPostsForModule(m.slug);
    for (const p of posts) {
      chain.push({
        moduleSlug: m.slug,
        moduleTitle: m.title,
        moduleOrder: m.order,
        postSlug: p.slug,
        postTitle: p.title,
        postOrder: p.order,
      });
    }
  }
  return chain;
}

export function getLessonNeighbors(
  moduleSlug: string,
  postSlug: string,
): { prev: LessonRef | null; next: LessonRef | null; current: LessonRef | null } {
  const chain = getAllLessons();
  const idx = chain.findIndex(
    (l) => l.moduleSlug === moduleSlug && l.postSlug === postSlug,
  );
  if (idx === -1) return { prev: null, next: null, current: null };
  return {
    prev: idx > 0 ? chain[idx - 1] : null,
    next: idx < chain.length - 1 ? chain[idx + 1] : null,
    current: chain[idx],
  };
}
