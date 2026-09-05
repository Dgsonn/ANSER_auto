"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  TableWrap,
  formatDate,
  formatVnd,
} from "@/components/ui/PageShell";

type PurchaseLedgerEntry = {
  id: string;
  postingDate: string;
  voucherDate: string | null;
  voucherNo: string | null;
  invoiceNo: string | null;
  partnerName: string;
  description: string | null;
  amountBeforeTax: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  invoiceStatus: "not_received" | "received" | "none";
  documentType: string | null;
};

const INVOICE_STATUS_LABEL: Record<PurchaseLedgerEntry["invoiceStatus"], string> = {
  not_received: "Chưa nhận HĐ",
  received: "Đã nhận HĐ",
  none: "Không có HĐ",
};

const INVOICE_STATUS_TONE: Record<PurchaseLedgerEntry["invoiceStatus"], "emerald" | "orange" | "zinc"> = {
  not_received: "orange",
  received: "emerald",
  none: "zinc",
};

export default function PurchaseLedgerPage() {
  const [entries, setEntries] = useState<PurchaseLedgerEntry[]>([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (term: string, fromDate: string, toDate: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set("search", term);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/purchase-ledger?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được sổ mua hàng.");
      setEntries(data.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search, from, to), 300);
    return () => clearTimeout(timer);
  }, [search, from, to, load]);

  const totalAmount = entries.reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <div>
      <PageHeader
        title="Sổ mua hàng"
        subtitle="Hoá đơn mua hàng hoá, dịch vụ từ nhà cung cấp — sổ kế toán khai thuế."
      />

      <ErrorBanner message={error} />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên nhà cung cấp..."
          className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500"
        />
      </div>

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : entries.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ngày</th>
                  <th className="px-5 py-3 font-semibold">Số chứng từ</th>
                  <th className="px-5 py-3 font-semibold">Nhà cung cấp</th>
                  <th className="px-5 py-3 font-semibold">Diễn giải</th>
                  <th className="px-5 py-3 text-right font-semibold">Tiền hàng</th>
                  <th className="px-5 py-3 text-right font-semibold">Thuế GTGT</th>
                  <th className="px-5 py-3 text-right font-semibold">Thanh toán</th>
                  <th className="px-5 py-3 font-semibold">Hoá đơn</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap text-zinc-300">
                      {formatDate(e.postingDate)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-400">
                      {e.voucherNo ?? "—"}
                    </td>
                    <td className="px-5 py-3">{e.partnerName}</td>
                    <td className="px-5 py-3 text-zinc-400">{e.description ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">
                      {formatVnd(e.amountBeforeTax)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-300">{formatVnd(e.vatAmount)}</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {formatVnd(e.totalAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={INVOICE_STATUS_TONE[e.invoiceStatus]}>
                        {INVOICE_STATUS_LABEL[e.invoiceStatus]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08] text-sm font-semibold">
                  <td className="px-5 py-3" colSpan={6}>
                    Tổng ({entries.length} hoá đơn)
                  </td>
                  <td className="px-5 py-3 text-right">{formatVnd(totalAmount)}</td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
