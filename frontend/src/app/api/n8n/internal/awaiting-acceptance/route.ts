import { NextResponse } from "next/server";
import { handle } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { getCompanySettings } from "@/server/store/settings";
import { listOrdersAwaitingAcceptanceTooLong } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

// GET /api/n8n/internal/awaiting-acceptance?days=2
//
// Lệnh ở trạng thái "chờ nghiệm thu" quá `days` ngày — khách đã được báo 1 lần lúc lệnh
// chuyển sang trạng thái này (order_status_update), nhưng nếu quên không tới thì xe cứ
// chiếm chỗ xưởng mà không ai nhắc lại. Trả kèm `contactable` giống due-for-service, để
// workflow biết khách nào phải gọi điện thay vì chỉ trông chờ email.
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? 2);

    const [orders, company] = await Promise.all([
      listOrdersAwaitingAcceptanceTooLong(Number.isFinite(days) ? days : 2),
      getCompanySettings(),
    ]);

    const items = orders.map((o) => ({
      order_code: o.code,
      license_plate: o.plateSnapshot,
      vehicle: o.vehicleLabel,
      days_waiting: o.daysWaiting,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      customer_email: o.customerEmail,
      contactable: Boolean(o.customerEmail),
    }));

    return NextResponse.json({
      company_name: company.name,
      company_email: company.email ?? process.env.N8N_NOTIFY_EMAIL ?? null,
      count: items.length,
      contactable_count: items.filter((item) => item.contactable).length,
      items,
    });
  });
}
