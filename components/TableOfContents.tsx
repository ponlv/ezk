"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/content";

interface Props {
  headings: Heading[];
}

export function TableOfContents({ headings }: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    headings[0]?.id ?? null,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Track which heading is currently in the upper-third of the viewport. */
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Filter to entries currently in band, sort top-most first.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
          return;
        }
        // No heading currently visible — pick the closest one above viewport.
        const above = entries
          .filter((e) => e.boundingClientRect.top < 0)
          .sort(
            (a, b) =>
              b.boundingClientRect.top - a.boundingClientRect.top,
          );
        if (above.length > 0) setActiveId(above[0].target.id);
      },
      {
        // top: -80px to clear sticky header.
        // bottom: -65% so a section becomes "active" when its heading is in
        // the top ~35% of the viewport — matches reading position.
        rootMargin: "-80px 0px -65% 0px",
        threshold: [0, 1],
      },
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <>
      {/*
        Mobile / medium screens (<1440px): collapsible card in-flow tại
        đầu content. Khi mở rộng đủ chỗ (≥1440px) — dùng fixed sidebar
        bên dưới, ẩn cái này đi để không hiện trùng.
      */}
      <div className="min-[1440px]:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-zinc-700"
          aria-expanded={mobileOpen}
        >
          <div className="flex items-center gap-2">
            <ListIcon />
            <span className="text-sm font-medium text-zinc-100">
              Mục lục
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              {headings.length} phần
            </span>
          </div>
          <ChevronIcon open={mobileOpen} />
        </button>

        {mobileOpen && (
          <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <TocList
              headings={headings}
              activeId={activeId}
              onClick={() => setMobileOpen(false)}
            />
          </div>
        )}
      </div>

      {/*
        Wide desktop (≥1440px): position:fixed sidebar bên trái viewport,
        OUTSIDE content flow → content giữ nguyên max-w-5xl mx-auto như
        ban đầu, không bị shrink. Ngưỡng 1440px là sweet spot: dưới đó
        max-w-5xl content + TOC 192px sẽ chồng lên nhau, nên fallback về
        collapsible.
      */}
      {/*
        max-height phải trừ:
          - top-24 (6rem)            ← khoảng trống trên cho site header
          - chiều cao music bar (~7rem) ← bottom bar fixed của MusicPlayer
          - gap an toàn (~1rem)
        Tổng: 100vh - 14rem
      */}
      <nav
        aria-label="Mục lục"
        className="scrollbar-thin fixed left-2 top-24 z-30 hidden max-h-[calc(100vh-14rem)] w-56 overflow-y-auto pr-1 min-[1440px]:block"
      >
        <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Mục lục
        </p>
        <TocList headings={headings} activeId={activeId} />
      </nav>
    </>
  );
}

/* ---------- TOC list (shared) ---------- */

function TocList({
  headings,
  activeId,
  onClick,
}: {
  headings: Heading[];
  activeId: string | null;
  onClick?: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {headings.map((h) => {
        const active = h.id === activeId;
        return (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={onClick}
              className={`relative block border-l-2 py-1 pl-3 text-[13px] leading-snug transition ${
                h.level === 3 ? "ml-3" : ""
              } ${
                active
                  ? "border-l-rust-500 text-rust-300"
                  : "border-l-zinc-800 text-zinc-400 hover:border-l-zinc-600 hover:text-zinc-200"
              }`}
            >
              {h.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Icons ---------- */

function ListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-zinc-400"
      aria-hidden
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
