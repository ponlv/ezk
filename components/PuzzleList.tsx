"use client";

import { useMemo, useState } from "react";
import type { PuzzleRow } from "@/lib/puzzles";

function shorten(hex: string, head = 12, tail = 10): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 transition hover:border-rust-500/40 hover:text-rust-300"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

export function PuzzleList({ rows }: { rows: PuzzleRow[] }) {
  const [query, setQuery] = useState("");
  const [full, setFull] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    if (/^\d+$/.test(q)) return rows.filter((r) => String(r.bits).startsWith(q));
    return rows.filter(
      (r) => r.pub.includes(q) || r.address.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo bậc bit, public key hoặc address…"
          className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-rust-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setFull((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            full
              ? "border-rust-500/50 bg-rust-500/10 text-rust-300"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          {full ? "Rút gọn hex" : "Hiện hex đầy đủ"}
        </button>
        <span className="font-mono text-xs text-zinc-600">
          {filtered.length}/{rows.length} ví
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2.5 font-medium">Bậc</th>
              <th className="px-3 py-2.5 font-medium">Khoảng khoá</th>
              <th className="px-3 py-2.5 font-medium">Address</th>
              <th className="px-3 py-2.5 font-medium">Public key (đã lộ)</th>
              <th className="px-3 py-2.5 font-medium">Chi phí</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {filtered.map((r) => (
              <tr key={r.bits} className="transition hover:bg-zinc-900/40">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-sm text-zinc-200">
                  #{r.bits}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-500">
                  {r.rangeLabel}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs text-zinc-300">
                      {r.address}
                    </code>
                    <CopyButton value={r.address} label="address" />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <code
                      className={`font-mono text-xs text-rust-300 ${
                        full ? "break-all" : ""
                      }`}
                    >
                      {full ? r.pub : shorten(r.pub)}
                    </code>
                    <CopyButton value={r.pub} label="public key" />
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-500">
                  ≈{r.workLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
          Không có ví nào khớp. Xoá ô tìm kiếm để xem lại cả 200 bài.
        </p>
      )}
    </div>
  );
}
