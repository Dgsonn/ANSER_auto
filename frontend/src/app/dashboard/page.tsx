import StatCard from "@/components/dashboard/StatCard";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CarIcon,
  ClipboardIcon,
  ReceiptIcon,
} from "@/components/dashboard/icons";
import { formatVnd } from "@/lib/format";
import { getOverviewSummary } from "@/server/reports";

// Số liệu phải tươi theo từng request — và force-dynamic cũng ngăn Next prerender
// trang này lúc build, khi chưa có kết nối DB.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getOverviewSummary();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-orange-600/15 to-amber-500/5 p-6">
        <h1 className="text-2xl font-bold">Tổng quan xưởng dịch vụ</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Hạ tầng đã dựng xong. Các màn hình nghiệp vụ (lịch hẹn, lệnh sửa chữa, kho phụ tùng…)
          sẽ được xây trên đúng bộ schema và lớp server này.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Xe đang trong xưởng"
          value={String(summary.activeOrders)}
          accent="orange"
          icon={ClipboardIcon}
        />
        <StatCard
          label="Lịch hẹn hôm nay"
          value={String(summary.appointmentsToday)}
          accent="sky"
          icon={CalendarIcon}
        />
        <StatCard
          label="Đã giao xe hôm nay"
          value={String(summary.deliveredToday)}
          accent="emerald"
          icon={CarIcon}
        />
        <StatCard
          label="Doanh thu tháng này"
          value={formatVnd(summary.revenueThisMonth)}
          note={`Công nợ chưa thu: ${formatVnd(summary.unpaidAmount)}`}
          accent="violet"
          icon={ReceiptIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <AlertTriangleIcon className="h-4 w-4 text-red-400" />
            Phụ tùng sắp hết
          </h2>
          {summary.lowStockParts.length === 0 ? (
            <p className="text-sm text-zinc-500">Không có phụ tùng nào dưới ngưỡng.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.lowStockParts.map((part) => (
                <li
                  key={part.id}
                  className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-mono text-xs text-zinc-500">{part.code}</span>{" "}
                    {part.name}
                  </span>
                  <span className="text-red-400">
                    {part.stock}/{part.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <CarIcon className="h-4 w-4 text-sky-400" />
            Xe tới hạn bảo dưỡng
          </h2>
          {summary.dueForService.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Chưa có xe nào tới hạn. Danh sách này sinh ra từ mốc bảo dưỡng ghi trên hồ sơ xe.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.dueForService.map((vehicle) => (
                <li
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-mono text-xs text-zinc-400">{vehicle.licensePlate}</span>{" "}
                    {vehicle.make} {vehicle.model}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {vehicle.nextServiceAt
                      ? new Date(vehicle.nextServiceAt).toLocaleDateString("vi-VN")
                      : "Theo số km"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
