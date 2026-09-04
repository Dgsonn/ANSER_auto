import { NextResponse } from "next/server";
import { handle } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { getCompanySettings } from "@/server/store/settings";
import { listVehiclesDueForService } from "@/server/store/vehicles";

export const dynamic = "force-dynamic";

const DUE_REASON_LABELS = {
  date: "tới hạn theo thời gian",
  odometer: "tới hạn theo số km",
  both: "tới hạn theo cả thời gian và số km",
} as const;

// GET /api/n8n/internal/due-for-service?days=7&km=500
//
// Trả kèm `contactable` (có email để nhắc được hay không) để workflow lọc thẳng, thay vì
// phải viết lại logic đó trong node Code — và để email tổng gửi cho gara nói rõ còn bao
// nhiêu khách phải gọi điện tay.
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? 7);
    const km = Number(url.searchParams.get("km") ?? 500);

    const [vehicles, company] = await Promise.all([
      listVehiclesDueForService({
        withinDays: Number.isFinite(days) ? days : 7,
        withinKm: Number.isFinite(km) ? km : 500,
      }),
      getCompanySettings(),
    ]);

    const items = vehicles.map((vehicle) => ({
      license_plate: vehicle.licensePlate,
      vehicle: `${vehicle.make} ${vehicle.model}`,
      odometer: vehicle.odometer,
      next_service_at: vehicle.nextServiceAt,
      next_service_odometer: vehicle.nextServiceOdometer,
      due_reason: vehicle.dueReason,
      due_reason_label: DUE_REASON_LABELS[vehicle.dueReason],
      customer_name: vehicle.customerName,
      customer_phone: vehicle.customerPhone,
      customer_email: vehicle.customerEmail,
      contactable: Boolean(vehicle.customerEmail),
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
