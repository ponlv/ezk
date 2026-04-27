"use client";

import { useEffect, useRef, useState } from "react";
import { extractVideoId, playlist, type YouTubeTrack } from "@/lib/playlist";

const STORAGE_KEY = "ezk:player";
const PLAYER_ELEMENT_ID = "ezk-yt-player";

interface PersistedState {
  trackIdx: number;
  volume: number;
  /** Vị trí giây đã phát của bài hiện tại — dùng để resume sau reload */
  currentTime: number;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(s: number, allowSeekAhead?: boolean): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: Record<string, unknown>,
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface ResolvedTrack {
  track: YouTubeTrack;
  videoId: string;
}

const validTracks = (): ResolvedTrack[] =>
  playlist
    .map((t) => ({ track: t, videoId: extractVideoId(t.url) }))
    .filter((x): x is ResolvedTrack => !!x.videoId);

export function MusicPlayer() {
  const tracks = useRef(validTracks()).current;

  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(40);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);
  /** Thời điểm cần seek-to khi player ready lần đầu (đọc từ localStorage). */
  const resumeAtRef = useRef(0);

  /* ---------- localStorage ---------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as PersistedState;
        if (
          typeof s.trackIdx === "number" &&
          s.trackIdx >= 0 &&
          s.trackIdx < tracks.length
        ) {
          setTrackIdx(s.trackIdx);
        }
        if (typeof s.volume === "number") setVolume(s.volume);
        if (typeof s.currentTime === "number" && s.currentTime > 0) {
          resumeAtRef.current = s.currentTime;
          setCurrentTime(s.currentTime);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [tracks.length]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ trackIdx, volume, currentTime }),
      );
    } catch {
      /* ignore */
    }
  }, [trackIdx, volume, currentTime, hydrated]);

  /* ---------- final save on tab close / navigate away ---------- */
  useEffect(() => {
    const flush = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime();
        if (typeof t !== "number") return;
        const raw = localStorage.getItem(STORAGE_KEY);
        const prev = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...prev, currentTime: t }),
        );
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  /* ---------- YouTube IFrame API ---------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      setApiReady(true);
    };
  }, []);

  useEffect(() => {
    if (!apiReady || !window.YT || playerRef.current) return;
    if (tracks.length === 0) return;
    const initial = tracks[trackIdx];
    if (!initial) return;

    playerRef.current = new window.YT.Player(PLAYER_ELEMENT_ID, {
      height: "180",
      width: "320",
      videoId: initial.videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        // Resume position từ lần thoát trước. YouTube `start` chỉ nhận số nguyên.
        start: Math.max(0, Math.floor(resumeAtRef.current)),
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          e.target.setVolume(volume);
          try {
            setDuration(e.target.getDuration());
            // Phòng khi `start` param không kick in (live stream, ...) — seek thủ công.
            if (resumeAtRef.current > 0) {
              e.target.seekTo(resumeAtRef.current, true);
            }
          } catch {
            /* ignore */
          }
        },
        onStateChange: (e: { data: number }) => {
          const YT = window.YT!;
          if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
          else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
          else if (e.data === YT.PlayerState.ENDED) {
            setTrackIdx((i) => (i + 1) % tracks.length);
          }
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, tracks.length]);

  /* ---------- track change loads new video ---------- */
  useEffect(() => {
    if (!playerRef.current) return;
    const t = tracks[trackIdx];
    if (!t) return;
    try {
      playerRef.current.loadVideoById(t.videoId);
      // Bài mới — reset progress về 0, không giữ resume position của bài cũ.
      resumeAtRef.current = 0;
      setCurrentTime(0);
    } catch {
      /* not ready */
    }
  }, [trackIdx, tracks]);

  /* ---------- volume sync ---------- */
  useEffect(() => {
    try {
      playerRef.current?.setVolume(volume);
    } catch {
      /* ignore */
    }
  }, [volume]);

  /* ---------- progress polling while playing ---------- */
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime();
        const d = p.getDuration();
        if (typeof t === "number") setCurrentTime(t);
        if (typeof d === "number" && d > 0) setDuration(d);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearInterval(id);
  }, [playing]);

  /* ---------- lock body scroll when mobile fullscreen ---------- */
  useEffect(() => {
    if (mobileExpanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileExpanded]);

  /* ---------- close playlist popover on outside click ---------- */
  useEffect(() => {
    if (!showPlaylist) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-playlist-popover]") && !target.closest("[data-playlist-toggle]")) {
        setShowPlaylist(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showPlaylist]);

  /* ---------- controls ---------- */
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };
  const next = () => {
    if (tracks.length === 0) return;
    setTrackIdx((i) => (i + 1) % tracks.length);
  };
  const prev = () => {
    if (tracks.length === 0) return;
    setTrackIdx((i) => (i - 1 + tracks.length) % tracks.length);
  };
  const seek = (sec: number) => {
    try {
      playerRef.current?.seekTo(sec, true);
      setCurrentTime(sec);
    } catch {
      /* ignore */
    }
  };

  if (!hydrated || tracks.length === 0) {
    /* Always-mounted hidden iframe placeholder for empty playlist */
    return null;
  }

  const current = tracks[trackIdx];
  const thumbSm = `https://i.ytimg.com/vi/${current.videoId}/mqdefault.jpg`;
  const thumbLg = `https://i.ytimg.com/vi/${current.videoId}/hqdefault.jpg`;

  return (
    <>
      {/* Hidden YT iframe — always rendered to keep audio alive */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0"
        style={{ width: 1, height: 1, opacity: 0, overflow: "hidden", zIndex: -1 }}
      >
        <div id={PLAYER_ELEMENT_ID} />
      </div>

      {/* ---------- Desktop bottom bar (md+) ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSm}
              alt=""
              className="h-12 w-20 shrink-0 rounded object-cover"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">
                {current.track.title}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {current.track.artist ?? ""}
              </p>
            </div>
          </div>

          {/* Center controls + progress */}
          <div className="flex flex-[2] flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <CtrlButton onClick={prev} title="Bài trước" disabled={tracks.length <= 1}>
                <PrevIcon />
              </CtrlButton>
              <CtrlButton onClick={togglePlay} title={playing ? "Pause" : "Play"} primary size="lg">
                {playing ? <PauseIcon /> : <PlayIcon />}
              </CtrlButton>
              <CtrlButton onClick={next} title="Bài sau" disabled={tracks.length <= 1}>
                <NextIcon />
              </CtrlButton>
            </div>
            <Progress
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
              compact
            />
          </div>

          {/* Volume + playlist toggle */}
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <VolumeIcon />
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="h-1 w-24 cursor-pointer accent-rust-500"
                aria-label="Volume"
              />
            </div>
            <button
              data-playlist-toggle
              onClick={() => setShowPlaylist((v) => !v)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${
                showPlaylist
                  ? "bg-rust-500/20 text-rust-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
              aria-label="Playlist"
              title="Danh sách"
            >
              <ListIcon />
              {tracks.length > 1 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust-500 px-1 font-mono text-[10px] font-semibold text-zinc-950">
                  {tracks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Playlist popover */}
        {showPlaylist && (
          <div
            data-playlist-popover
            className="absolute bottom-full right-6 mb-2 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <span className="text-xs font-medium text-zinc-300">
                Playlist · {tracks.length}
              </span>
              <button
                onClick={() => setShowPlaylist(false)}
                className="text-zinc-500 hover:text-zinc-200"
                aria-label="Đóng"
              >
                <CloseIcon />
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {tracks.map(({ track, videoId }, i) => (
                <PlaylistItem
                  key={track.url}
                  index={i}
                  track={track}
                  videoId={videoId}
                  active={i === trackIdx}
                  playing={playing && i === trackIdx}
                  onClick={() => setTrackIdx(i)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ---------- Mobile mini bar (md-) ---------- */}
      <div className="fixed inset-x-2 bottom-2 z-40 md:hidden">
        <button
          onClick={() => setMobileExpanded(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/95 px-3 py-2.5 text-left shadow-xl backdrop-blur-md"
          aria-label="Mở player"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSm}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {current.track.title}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {current.track.artist ?? ""}
            </p>
          </div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rust-500 text-zinc-950"
            role="button"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      </div>

      {/* ---------- Mobile fullscreen now-playing ---------- */}
      {mobileExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-zinc-900 via-zinc-950 to-black md:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2 pt-6">
            <button
              onClick={() => setMobileExpanded(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800/50"
              aria-label="Đóng"
            >
              <ChevronDownIcon />
            </button>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Đang phát
              </p>
              <p className="text-xs text-zinc-300">
                {trackIdx + 1} / {tracks.length}
              </p>
            </div>
            <span className="h-10 w-10" />
          </div>

          {/* Album art */}
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbLg}
              alt=""
              className="aspect-video w-full max-w-md rounded-2xl object-cover shadow-2xl ring-1 ring-zinc-800"
            />

            {/* Title + artist */}
            <div className="mt-8 w-full max-w-md text-center">
              <h2 className="line-clamp-2 text-xl font-bold text-zinc-50">
                {current.track.title}
              </h2>
              {current.track.artist && (
                <p className="mt-1 text-sm text-zinc-400">
                  {current.track.artist}
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="mt-6 w-full max-w-md">
              <Progress
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
              />
            </div>

            {/* Big controls */}
            <div className="mt-6 flex items-center justify-center gap-10">
              <CtrlButton onClick={prev} title="Bài trước" size="lg" disabled={tracks.length <= 1}>
                <PrevIcon big />
              </CtrlButton>
              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-rust-500 text-zinc-950 shadow-lg active:scale-95"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <PauseIcon big /> : <PlayIcon big />}
              </button>
              <CtrlButton onClick={next} title="Bài sau" size="lg" disabled={tracks.length <= 1}>
                <NextIcon big />
              </CtrlButton>
            </div>

            {/* Volume */}
            <div className="mt-6 flex w-full max-w-md items-center gap-3">
              <VolumeIcon />
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="h-1 flex-1 cursor-pointer accent-rust-500"
                aria-label="Volume"
              />
              <span className="w-8 text-right font-mono text-[10px] text-zinc-500">
                {volume}
              </span>
            </div>
          </div>

          {/* Up next */}
          {tracks.length > 1 && (
            <div className="border-t border-zinc-800/80 bg-black/40 px-4 pb-6 pt-4 backdrop-blur-md">
              <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Tiếp theo
              </p>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                {tracks.map(({ track, videoId }, i) => (
                  <PlaylistItem
                    key={track.url}
                    index={i}
                    track={track}
                    videoId={videoId}
                    active={i === trackIdx}
                    playing={playing && i === trackIdx}
                    onClick={() => setTrackIdx(i)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Subcomponents ---------- */

function PlaylistItem({
  index,
  track,
  videoId,
  active,
  playing,
  onClick,
}: {
  index: number;
  track: YouTubeTrack;
  videoId: string;
  active: boolean;
  playing: boolean;
  onClick: () => void;
}) {
  const thumb = `https://i.ytimg.com/vi/${videoId}/default.jpg`;
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition ${
          active
            ? "bg-rust-500/10 text-rust-200"
            : "text-zinc-300 hover:bg-zinc-900"
        }`}
      >
        <span className="w-5 shrink-0 text-center font-mono text-[10px] text-zinc-600">
          {active && playing ? <SoundWaveIcon /> : String(index + 1).padStart(2, "0")}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className="h-8 w-12 shrink-0 rounded object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{track.title}</p>
          {track.artist && (
            <p className="truncate text-[10px] text-zinc-500">{track.artist}</p>
          )}
        </div>
      </button>
    </li>
  );
}

function Progress({
  currentTime,
  duration,
  onSeek,
  compact,
}: {
  currentTime: number;
  duration: number;
  onSeek: (s: number) => void;
  compact?: boolean;
}) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)) * duration);
  };
  return (
    <div className={`flex w-full items-center gap-2 ${compact ? "" : "px-1"}`}>
      <span className="w-10 text-right font-mono text-[10px] tabular-nums text-zinc-500">
        {fmtTime(currentTime)}
      </span>
      <div
        onClick={handleClick}
        className="group relative h-1 flex-1 cursor-pointer rounded-full bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-rust-500 transition-[width] group-hover:bg-rust-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 font-mono text-[10px] tabular-nums text-zinc-500">
        {fmtTime(duration)}
      </span>
    </div>
  );
}

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CtrlButton({
  onClick,
  title,
  primary,
  disabled,
  size = "md",
  children,
}: {
  onClick: () => void;
  title: string;
  primary?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const sizeCls = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 ${sizeCls} ${
        primary
          ? "bg-zinc-100 text-zinc-950 hover:bg-white"
          : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Icons ---------- */

function PlayIcon({ big }: { big?: boolean }) {
  const s = big ? 22 : 14;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor" aria-hidden>
      <path d="M7 5v14l12-7z" />
    </svg>
  );
}
function PauseIcon({ big }: { big?: boolean }) {
  const s = big ? 22 : 14;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function PrevIcon({ big }: { big?: boolean }) {
  const s = big ? 24 : 16;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor" aria-hidden>
      <path d="M6 5h2v14H6zM20 5v14L9 12z" />
    </svg>
  );
}
function NextIcon({ big }: { big?: boolean }) {
  const s = big ? 24 : 16;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor" aria-hidden>
      <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-zinc-500"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SoundWaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-rust-400" aria-hidden>
      <path d="M4 12v0">
        <animate attributeName="d" dur="0.9s" repeatCount="indefinite" values="M4 14v-4;M4 10v4;M4 14v-4" />
      </path>
      <path d="M12 12v0">
        <animate attributeName="d" dur="1s" repeatCount="indefinite" values="M12 16v-8;M12 8v8;M12 16v-8" />
      </path>
      <path d="M20 12v0">
        <animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="M20 13v-2;M20 11v2;M20 13v-2" />
      </path>
    </svg>
  );
}
