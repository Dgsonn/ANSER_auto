import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { APPOINTMENT_STATUSES } from "@/server/domain";
import { requireUser } from "@/server/session";
import { createAppointment, listAppointments } from "@/server/store/appointments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    return NextResponse.json({
      appointments: await listAppointments({
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        status: url.searchParams.get("status") ?? undefined,
      }),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const body = await request.json().catch(() => ({}));

    if (!body.branchId) return badRequest("Thiếu chi nhánh.");
    if (!body.scheduledAt) return badRequest("Thiếu thời gian hẹn.");

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return badRequest("Thời gian hẹn không hợp lệ.");

    // Phải có cách liên hệ lại: hẹn không có tên lẫn SĐT lẫn hồ sơ khách thì tới giờ không
    // ai gọi được cho ai.
    if (!body.customerId && !body.contactName?.trim() && !body.contactPhone?.trim()) {
      return badRequest("Cần chọn khách hàng hoặc nhập tên/số điện thoại liên hệ.");
    }

    if (body.status && !APPOINTMENT_STATUSES.includes(body.status)) {
      return badRequest("Trạng thái không hợp lệ.");
    }

    const appointment = await createAppointment({
      branchId: body.branchId,
      scheduledAt,
      customerId: body.customerId || null,
      vehicleId: body.vehicleId || null,
      contactName: body.contactName?.trim() || null,
      contactPhone: body.contactPhone?.trim() || null,
      plateText: body.plateText?.trim() || null,
      source: body.source || "phone",
      requestNote: body.requestNote?.trim() || null,
      status: body.status || "pending",
    });

    return NextResponse.json({ appointment }, { status: 201 });
  });
}
