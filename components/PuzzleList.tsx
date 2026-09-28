"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { PuzzleRow } from "@/lib/puzzles";
import {
  clearProgress,
  loadProgress,
  saveProgress,
  type SolvedMap,
} from "@/lib/puzzle-progress";
import { checkPrivateKey } from "@/lib/puzzle-check";

function shorten(hex: string, head = 12, tail = 10): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

type CheckState = "idle" | "unparsed" | "outside" | "wrong";

export function PuzzleList({ rows }: { rows: PuzzleRow[] }) {
  const [query, setQuery] = useState("");
  const [full, setFull] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [solved, setSolved] = useState<SolvedMap>({});
  const [openForm, setOpenForm] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [check, setCheck] = useState<CheckState>("idle");

  // Đọc tiến độ sau khi mount (localStorage không tồn tại lúc SSR) và xác minh
  // lại từng khoá đã lưu — dữ liệu trong localStorage có thể bị sửa tay.
  useEffect(() => {
    const stored = loadProgress();
    const byBits = new Map(rows.map((r) => [String(r.bits), r]));
    const clean: SolvedMap = {};
    for (const [bits, entry] of Object.entries(stored)) {
      const row = byBits.get(bits);
      if (!row) continue;
      if (checkPrivateKey(entry.privHex, row).ok) clean[bits] = entry;
    }
    setSolved(clean);
    if (Object.keys(clean).length !== Object.keys(stored).length) {
      saveProgress(clean);
    }
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyOpen && solved[String(r.bits)]) return false;
      if (!q) return true;
      if (/^\d+$/.test(q)) return String(r.bits).startsWith(q);
      return r.pub.includes(q) || r.address.toLowerCase().includes(q);
    });
  }, [rows, query, onlyOpen, solved]);

  const solvedCount = Object.keys(solved).length;
  const highest = useMemo(
    () =>
      Object.keys(solved).reduce((max, bits) => Math.max(max, Number(bits)), 0),
    [solved],
  );

  function openCheck(bits: number) {
    setOpenForm(bits);
    setDraft("");
    setCheck("idle");
  }

  function submit(row: PuzzleRow) {
    const result = checkPrivateKey(draft, row);
    if (!result.ok) {
      setCheck(result.reason === "empty" ? "idle" : result.reason);
      return;
    }

    const next: SolvedMap = {
      ...solved,
      [String(row.bits)]: { privHex: result.privHex, at: new Date().toISOString() },
    };
    setSolved(next);
    saveProgress(next);
    setOpenForm(null);
    setDraft("");
    setCheck("idle");
  }

  function forget(bits: number) {
    const next = { ...solved };
    delete next[String(bits)];
    setSolved(next);
    saveProgress(next);
  }

  return (
    <div className="space-y-4">
      {/* --- tiến độ --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <div className="text-sm">
          <span className="text-zinc-400">Đã giải </span>
          <span className="font-mono font-semibold text-emerald-300">
            {solvedCount}
          </span>
          <span className="font-mono text-zinc-600">/{rows.length}</span>
          {highest > 0 && (
            <span className="ml-3 text-zinc-500">
              bậc cao nhất{" "}
              <span className="font-mono text-zinc-300">#{highest}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">
            lưu trong trình duyệt này
          </span>
          {solvedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                clearProgress();
                setSolved({});
              }}
              className="rounded border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500 transition hover:border-rose-500/40 hover:text-rose-300"
            >
              xoá tiến độ
            </button>
          )}
        </div>
      </div>

      {/* --- điều khiển --- */}
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
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            onlyOpen
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          }`}
        >
          Chỉ bài chưa giải
        </button>
        <span className="font-mono text-xs text-zinc-600">
          {filtered.length}/{rows.length} ví
        </span>
      </div>

      {/* --- bảng --- */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2.5 font-medium">Bậc</th>
              <th className="px-3 py-2.5 font-medium">Khoảng khoá</th>
              <th className="px-3 py-2.5 font-medium">Address</th>
              <th className="px-3 py-2.5 font-medium">Public key (đã lộ)</th>
              <th className="px-3 py-2.5 font-medium">Chi phí</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {filtered.map((r) => {
              const entry = solved[String(r.bits)];
              const isOpen = openForm === r.bits;

              return (
                <Fragment key={r.bits}>
                  <tr
                    className={`transition ${
                      entry ? "bg-emerald-500/[0.04]" : "hover:bg-zinc-900/40"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="font-mono text-sm text-zinc-200">
                        #{r.bits}
                      </span>
                      {entry && (
                        <span className="ml-2 font-mono text-xs text-emerald-400">
                          ✓
                        </span>
                      )}
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
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          isOpen ? setOpenForm(null) : openCheck(r.bits)
                        }
                        className={`rounded border px-2 py-0.5 text-[11px] transition ${
                          isOpen
                            ? "border-zinc-700 text-zinc-300"
                            : entry
                              ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                              : "border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
                        }`}
                      >
                        {isOpen ? "đóng" : entry ? "đáp án" : "nhập khoá"}
                      </button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-zinc-900/60">
                      <td colSpan={6} className="px-3 py-3">
                        {entry ? (
                          <SolvedPanel
                            entry={entry}
                            onForget={() => forget(r.bits)}
                          />
                        ) : (
                          <CheckForm
                            row={r}
                            draft={draft}
                            onDraft={(v) => {
                              setDraft(v);
                              setCheck("idle");
                            }}
                            state={check}
                            onSubmit={() => submit(r)}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
          Không có ví nào khớp. Xoá bộ lọc để xem lại cả {rows.length} bài.
        </p>
      )}
    </div>
  );
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

function CheckForm({
  row,
  draft,
  onDraft,
  state,
  onSubmit,
}: {
  row: PuzzleRow;
  draft: string;
  onDraft: (value: string) => void;
  state: CheckState;
  onSubmit: () => void;
}) {
  const message: Record<CheckState, string | null> = {
    idle: null,
    unparsed: "Không đọc được: chỉ nhận hex (có hoặc không 0x) và số thập phân.",
    outside: `Khoá không nằm trong khoảng của bậc #${row.bits} — kiểm tra lại bạn đang giải đúng bài chưa.`,
    wrong: "Sai: k·G không ra public key của bài này.",
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Nhập private key bậc{" "}
        <span className="font-mono text-zinc-300">#{row.bits}</span> — hex hoặc
        thập phân. Kiểm tra chạy ngay trong máy bạn: tính{" "}
        <span className="font-mono text-zinc-400">k·G</span> rồi so với public
        key đã công bố. Khoá không được gửi đi đâu.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder="ví dụ: 3d94fa… hoặc 4028175943"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-rust-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs text-sky-300 transition hover:bg-sky-500/10"
        >
          Kiểm tra
        </button>
      </div>
      {message[state] && (
        <p className="text-xs text-rose-400">{message[state]}</p>
      )}
    </div>
  );
}

function SolvedPanel({
  entry,
  onForget,
}: {
  entry: { privHex: string; at: string };
  onForget: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-emerald-300">
        Đã xác minh {new Date(entry.at).toLocaleString("vi-VN")}
      </p>
      <div className="flex items-start gap-2">
        <code className="min-w-0 break-all font-mono text-xs text-emerald-200">
          {entry.privHex}
        </code>
        <CopyButton value={entry.privHex} label="private key" />
      </div>
      <button
        type="button"
        onClick={onForget}
        className="rounded border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500 transition hover:border-rose-500/40 hover:text-rose-300"
      >
        bỏ khỏi tiến độ
      </button>
    </div>
  );
}
