"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState, ErrorBanner, PageHeader, TableWrap } from "@/components/ui/PageShell";

type Totals = {
  done: number;
  inProgress: number;
  pending: number;
  totalActualMinutes: number;
  totalStandardMinutes: number;
};

type DoneJob = {
  laborId: string;
  orderCode: string;
  plateSnapshot: string;
  vehicleLabel: string;
  name: string;
  standardMinutes: number | null;
  actualMinutes: number | null;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export default function WorkReportPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [doneJobs, setDoneJobs] = useState<DoneJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/technician/work-report")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          setTotals(data.totals);
          setDoneJobs(data.doneJobs);
        } else setError(data?.message ?? "Không tải được báo cáo.");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được báo cáo.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Báo cáo công việc"
        subtitle="Tổng hợp công việc của bạn trên mọi lệnh sửa chữa đang mở."
      />

      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState title="Đang tải..." />
      ) : totals ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Đã hoàn tất" value={String(totals.done)} />
            <StatTile label="Đang làm" value={String(totals.inProgress)} />
            <StatTile label="Chờ làm" value={String(totals.pending)} />
            <StatTile
              label="Giờ công thực tế"
              value={`${Math.round((totals.totalActualMinutes / 60) * 10) / 10} giờ`}
            />
          </div>

          <Card>
            {doneJobs.length === 0 ? (
              <EmptyState title="Chưa có việc nào hoàn tất." />
            ) : (
              <TableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Lệnh / Xe</th>
                      <th className="px-5 py-3 font-semibold">Công việc</th>
                      <th className="px-5 py-3 text-right font-semibold">Giờ công (thực tế / định mức)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doneJobs.map((job) => (
                      <tr key={job.laborId} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-5 py-3">
                          <div className="font-mono text-xs font-semibold">{job.orderCode}</div>
                          <div className="text-xs text-zinc-500">
                            {job.plateSnapshot} · {job.vehicleLabel}
                          </div>
                        </td>
                        <td className="px-5 py-3">{job.name}</td>
                        <td className="px-5 py-3 text-right text-zinc-400">
                          {job.actualMinutes ?? "—"} / {job.standardMinutes ?? "—"} phút
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
