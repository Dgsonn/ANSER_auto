import { NextResponse } from "next/server";
import { badRequest, handle, notFound, unauthorized } from "@/server/api";
import { APPOINTMENT_STATUSES } from "@/server/domain";
import { requireUser } from "@/server/session";
import {
  deleteAppointment,
  getAppointmentById,
  updateAppointment,
  type AppointmentInput,
} from "@/server/store/appointments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Partial<AppointmentInput> = {};
    if ("status" in body) {
      if (!APPOINTMENT_STATUSES.includes(body.status)) return badRequest("Trạng thái không hợp lệ.");
      patch.status = body.status;
    }
    if ("scheduledAt" in body && body.scheduledAt) {
      const scheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) return badRequest("Thời gian hẹn không hợp lệ.");
      patch.scheduledAt = scheduledAt;
    }
    if ("branchId" in body && body.branchId) patch.branchId = body.branchId;
    if ("customerId" in body) patch.customerId = body.customerId || null;
    if ("vehicleId" in body) patch.vehicleId = body.vehicleId || null;
    if ("contactName" in body) patch.contactName = body.contactName?.trim() || null;
    if ("contactPhone" in body) patch.contactPhone = body.contactPhone?.trim() || null;
    if ("plateText" in body) patch.plateText = body.plateText?.trim() || null;
    if ("requestNote" in body) patch.requestNote = body.requestNote?.trim() || null;

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    const appointment = await updateAppointment(id, patch);
    if (!appointment) return notFound("Không tìm thấy lịch hẹn.");
    return NextResponse.json({ appointment });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    if (!(await getAppointmentById(id))) return notFound("Không tìm thấy lịch hẹn.");
    await deleteAppointment(id);
    return new NextResponse(null, { status: 204 });
  });
}
