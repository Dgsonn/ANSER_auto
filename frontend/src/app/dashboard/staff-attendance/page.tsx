"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, ErrorBanner, TableWrap } from "@/components/ui/PageShell";

const PERIOD_TABS: Array<{ value: string; label: string }> = [
  { value: "day", label: "Hôm nay" },
  { value: "week", label: "7 ngày" },
  { value: "month", label: "30 ngày" },
];

type Row = {
  employeeId: string;
  employeeName: string;
  position: string | null;
  shiftCount: number;
  totalMinutes: number;
  clockedInNow: boolean;
};

function formatHours(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10} giờ`;
}

export default function StaffAttendancePage() {
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attendance/summary?period=${period}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          setRows(data.rows);
          setError(null);
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
  }, [period]);

  // setState thật ở đây (trong sự kiện bấm tab), không phải trong effect — đổi kỳ thì
  // hiện lại "Đang tải..." ngay, effect ở trên chỉ lo phần fetch.
  function handlePeriodChange(value: string) {
    setLoading(true);
    setPeriod(value);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chấm công nhân sự</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tổng giờ công theo kỳ để tính lương — chỉ hiện giờ công, không tự ra số tiền
            (quy tắc lương thật do gara tự áp dụng ngoài app).
          </p>
        </div>
        <div className="flex rounded-xl border border-white/[0.08] p-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handlePeriodChange(tab.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                period === tab.value ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : rows.length === 0 ? (
          <EmptyState title="Chưa có nhân sự nào đang làm việc." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nhân sự</th>
                  <th className="px-5 py-3 font-semibold">Chức vụ</th>
                  <th className="px-5 py-3 text-right font-semibold">Số ca</th>
                  <th className="px-5 py-3 text-right font-semibold">Tổng giờ công</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeeId} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3 font-semibold">{r.employeeName}</td>
                    <td className="px-5 py-3 text-zinc-400">{r.position ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{r.shiftCount}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatHours(r.totalMinutes)}</td>
                    <td className="px-5 py-3 text-right">
                      {r.clockedInNow && <Badge tone="emerald">Đang trong ca</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
