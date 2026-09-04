import StatCard from "@/components/dashboard/StatCard";
import { CarIcon, ChartIcon, ClipboardIcon, ReceiptIcon } from "@/components/dashboard/icons";
import { Card, EmptyState, TableWrap } from "@/components/ui/PageShell";
import { formatVnd } from "@/lib/format";
import { getRevenueReport, type ReportPeriod } from "@/server/reports";

export const dynamic = "force-dynamic";

const PERIOD_TABS: Array<{ value: ReportPeriod; label: string }> = [
  { value: "day", label: "Hôm nay" },
  { value: "week", label: "7 ngày" },
  { value: "month", label: "30 ngày" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: ReportPeriod =
    params.period === "week" || params.period === "month" ? params.period : "day";

  const report = await getRevenueReport(period);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo doanh thu</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tính theo ngày xuất hoá đơn — một lệnh mở tháng trước, thanh toán tháng này thì
            thuộc doanh thu tháng này.
          </p>
        </div>
        <div className="flex rounded-xl border border-white/[0.08] p-1">
          {PERIOD_TABS.map((tab) => (
            <a
              key={tab.value}
              href={`/dashboard/reports?period=${tab.value}`}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                period === tab.value ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Doanh thu ${report.periodLabel}`}
          value={formatVnd(report.revenue)}
          accent="orange"
          icon={ChartIcon}
        />
        <StatCard
          label="Đã thu"
          value={formatVnd(report.collected)}
          note={report.outstanding > 0 ? `Còn phải thu ${formatVnd(report.outstanding)}` : "Đã thu đủ"}
          accent={report.outstanding > 0 ? "red" : "emerald"}
          icon={ReceiptIcon}
        />
        <StatCard
          label="Số hoá đơn"
          value={String(report.invoiceCount)}
          accent="sky"
          icon={ClipboardIcon}
        />
        <StatCard
          label="Cơ cấu doanh thu"
          value={formatVnd(report.laborRevenue)}
          note={`Tiền công · phụ tùng ${formatVnd(report.partsRevenue)}`}
          accent="violet"
          icon={CarIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="border-b border-white/[0.08] px-5 py-3 text-sm font-bold">
            Hạng mục dịch vụ nhiều nhất
          </h2>
          {report.topServices.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu trong kỳ này." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                  <tr>
                    <th className="px-5 py-2 font-semibold">Hạng mục</th>
                    <th className="px-5 py-2 text-right font-semibold">SL</th>
                    <th className="px-5 py-2 text-right font-semibold">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topServices.map((s) => (
                    <tr key={s.name} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-2">{s.name}</td>
                      <td className="px-5 py-2 text-right">{s.quantity}</td>
                      <td className="px-5 py-2 text-right font-semibold">{formatVnd(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <h2 className="border-b border-white/[0.08] px-5 py-3 text-sm font-bold">
            Phụ tùng bán nhiều nhất
          </h2>
          {report.topParts.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu trong kỳ này." />
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                  <tr>
                    <th className="px-5 py-2 font-semibold">Phụ tùng</th>
                    <th className="px-5 py-2 text-right font-semibold">SL</th>
                    <th className="px-5 py-2 text-right font-semibold">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topParts.map((p) => (
                    <tr key={p.name} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-2">{p.name}</td>
                      <td className="px-5 py-2 text-right">{p.quantity}</td>
                      <td className="px-5 py-2 text-right font-semibold">{formatVnd(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
