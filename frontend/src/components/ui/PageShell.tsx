"use client";

import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:opacity-60"
      {...rest}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="rounded-xl bg-red-600/90 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] ${className}`}>
      {children}
    </div>
  );
}

// Bảng luôn cuộn ngang trong khung riêng thay vì làm cả trang cuộn — bảng lệnh sửa chữa
// có nhiều cột, và trang cuộn ngang làm sidebar trôi mất.
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-semibold text-zinc-400">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
      {message}
    </div>
  );
}

const TONE_CLASSES = {
  zinc: "bg-white/[0.06] text-zinc-300",
  sky: "bg-sky-500/15 text-sky-300",
  orange: "bg-orange-500/15 text-orange-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  red: "bg-red-500/15 text-red-300",
  violet: "bg-violet-500/15 text-violet-300",
} as const;

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

// Re-export cho tiện: các trang client vẫn import format từ đây như trước. Bản thân hàm
// nằm ở `@/lib/format` (module thuần) để Server Component cũng dùng được — file này có
// "use client" nên hàm định nghĩa ở đây sẽ không gọi được từ phía server.
export { formatDate, formatDateTime, formatVnd } from "@/lib/format";
