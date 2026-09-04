"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  PrimaryButton,
  TableWrap,
  formatDateTime,
} from "@/components/ui/PageShell";

type AttendanceLog = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  note: string | null;
};

function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export default function AttendancePage() {
  const [open, setOpen] = useState<AttendanceLog | null>(null);
  const [recent, setRecent] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/attendance");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.message ?? "Không tải được dữ liệu chấm công.");
      setLoading(false);
      return;
    }
    setOpen(data.open);
    setRecent(data.recent);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/attendance")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          setOpen(data.open);
          setRecent(data.recent);
        } else setError(data?.message ?? "Không tải được dữ liệu chấm công.");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được dữ liệu chấm công.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClockIn() {
    setBusy(true);
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không vào ca được.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    setBusy(true);
    try {
      const res = await fetch("/api/attendance/clock-out", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không ra ca được.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Chấm công" subtitle="Vào ca / ra ca hàng ngày của bạn." />

      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState title="Đang tải..." />
      ) : (
        <>
          <Card className="mb-6 p-6">
            {open ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge tone="emerald">Đang trong ca</Badge>
                  <p className="mt-2 text-sm text-zinc-400">
                    Vào ca lúc <b className="text-white">{formatDateTime(open.clockInAt)}</b> — đã{" "}
                    {formatDuration(open.clockInAt, null)}
                  </p>
                </div>
                <PrimaryButton onClick={handleClockOut} disabled={busy}>
                  {busy ? "Đang lưu..." : "Ra ca"}
                </PrimaryButton>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge tone="zinc">Chưa vào ca</Badge>
                  <p className="mt-2 text-sm text-zinc-400">Bấm nút bên phải khi bắt đầu ca làm việc.</p>
                </div>
                <PrimaryButton onClick={handleClockIn} disabled={busy}>
                  {busy ? "Đang lưu..." : "Vào ca"}
                </PrimaryButton>
              </div>
            )}
          </Card>

          <Card>
            {recent.length === 0 ? (
              <EmptyState title="Chưa có ca làm việc nào." />
            ) : (
              <TableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Vào ca</th>
                      <th className="px-5 py-3 font-semibold">Ra ca</th>
                      <th className="px-5 py-3 font-semibold">Thời lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((log) => (
                      <tr key={log.id} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-5 py-3">{formatDateTime(log.clockInAt)}</td>
                        <td className="px-5 py-3 text-zinc-400">
                          {log.clockOutAt ? formatDateTime(log.clockOutAt) : <Badge tone="emerald">Đang mở</Badge>}
                        </td>
                        <td className="px-5 py-3 text-zinc-400">
                          {formatDuration(log.clockInAt, log.clockOutAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
