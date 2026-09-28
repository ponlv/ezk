import type { Metadata } from "next";
import Link from "next/link";
import { MusicPlayer } from "@/components/MusicPlayer";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ezk.local"),
  title: {
    default: "ezk — Hành trình Zero → Hero ZKP với Rust",
    template: "%s · ezk",
  },
  description:
    "Blog ghi lại hành trình học Zero-Knowledge Proofs từ con số 0, lập trình bằng Rust, đi qua 6 giai đoạn từ toán học nền tảng đến ứng dụng blockchain thực tế.",
  authors: [{ name: "Pon Le" }],
  openGraph: {
    type: "website",
    title: "ezk — Hành trình Zero → Hero ZKP với Rust",
    description:
      "Lộ trình 6 giai đoạn học ZKP và Rust, từ finite fields đến zkVMs, halo2, plonky3, arkworks.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen">
        <div className="pb-24 md:pb-28">
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
          <SiteFooter />
        </div>
        <MusicPlayer />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="rounded-md bg-rust-500/20 px-2 py-1 font-mono text-sm font-semibold text-rust-400 ring-1 ring-rust-500/30 transition group-hover:bg-rust-500/30">
            ezk
          </span>
          <span className="hidden text-sm text-zinc-400 sm:inline">
            zero-knowledge × rust
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/modules"
            className="text-zinc-300 transition hover:text-rust-400"
          >
            Modules
          </Link>
          <Link
            href="/puzzles"
            className="text-zinc-300 transition hover:text-rust-400"
          >
            Puzzle
          </Link>
          <Link
            href="/about"
            className="text-zinc-300 transition hover:text-rust-400"
          >
            About
          </Link>
          <a
            href="https://github.com/arkworks-rs"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 transition hover:text-rust-400"
          >
            arkworks ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-800/80">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-zinc-500">
        <p>
          Built with Next.js · MDX · Tailwind. Một hành trình học ZKP công khai,
          mọi sai sót đều là phần của quá trình.
        </p>
      </div>
    </footer>
  );
}
