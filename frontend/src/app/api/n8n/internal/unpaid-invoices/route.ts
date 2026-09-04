import { NextResponse } from "next/server";
import { handle } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { getCompanySettings } from "@/server/store/settings";
import { listUnpaidInvoicesOlderThan } from "@/server/store/invoices";

export const dynamic = "force-dynamic";

// GET /api/n8n/internal/unpaid-invoices?days=7
//
// Hoá đơn "unpaid"/"partial" đã phát hành quá `days` ngày — dùng cho báo cáo công nợ NỘI
// BỘ (gửi quản lý, không gửi khách — xem listUnpaidInvoicesOlderThan()). Không trả
// customer_email vì workflow này không có nhánh gửi khách; số điện thoại vẫn trả để quản lý
// gọi điện trực tiếp nếu cần.
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? 7);

    const [invoiceList, company] = await Promise.all([
      listUnpaidInvoicesOlderThan(Number.isFinite(days) ? days : 7),
      getCompanySettings(),
    ]);

    const items = invoiceList.map((inv) => ({
      invoice_code: inv.code,
      customer_name: inv.customerName,
      customer_phone: inv.customerPhone,
      license_plate: inv.plateSnapshot,
      total: inv.total,
      paid_amount: inv.paidAmount,
      outstanding: inv.outstanding,
      days_old: inv.daysOld,
      status: inv.status,
    }));

    return NextResponse.json({
      company_name: company.name,
      company_email: company.email ?? process.env.N8N_NOTIFY_EMAIL ?? null,
      count: items.length,
      total_outstanding: items.reduce((sum, item) => sum + item.outstanding, 0),
      items,
    });
  });
}
