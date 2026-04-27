import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-sm text-rust-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-100">
        Không tìm thấy trang
      </h1>
      <p className="mt-2 text-zinc-400">
        Có thể bài viết chưa được publish, hoặc URL đã đổi.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-rust-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-rust-400"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
