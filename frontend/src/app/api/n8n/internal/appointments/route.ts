import { NextResponse } from "next/server";
import { handle } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { listUpcomingAppointments } from "@/server/store/appointments";
import { getCompanySettings } from "@/server/store/settings";

export const dynamic = "force-dynamic";

// GET /api/n8n/internal/appointments?hours=24
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const url = new URL(request.url);
    const hours = Number(url.searchParams.get("hours") ?? 24);

    const [appointments, company] = await Promise.all([
      listUpcomingAppointments(Number.isFinite(hours) ? hours : 24),
      getCompanySettings(),
    ]);

    const items = appointments.map((appointment) => ({
      id: appointment.id,
      scheduled_at: appointment.scheduledAt,
      // Định dạng sẵn giờ Việt Nam ở server: node Code trong n8n chạy theo timezone của
      // container, để nó tự format là mở đường cho email báo sai giờ hẹn.
      scheduled_at_text: appointment.scheduledAt.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      status: appointment.status,
      request_note: appointment.requestNote,
      branch_name: appointment.branchName,
      branch_phone: appointment.branchPhone,
      customer_name: appointment.contactName,
      customer_phone: appointment.contactPhone,
      customer_email: appointment.contactEmail,
      plate: appointment.plate,
      vehicle: appointment.vehicleLabel,
      contactable: Boolean(appointment.contactEmail),
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
