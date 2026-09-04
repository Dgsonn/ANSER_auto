import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { LABOR_STATUSES } from "@/server/domain";
import { requireUser } from "@/server/session";
import { OrderLockedError, removeLabor, updateLabor } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; laborId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { laborId } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Parameters<typeof updateLabor>[1] = {};
    if ("branchId" in body) patch.branchId = body.branchId || null;
    if ("technicianId" in body) patch.technicianId = body.technicianId || null;
    if ("note" in body) patch.note = body.note?.trim() || null;
    if ("status" in body) {
      if (!LABOR_STATUSES.includes(body.status)) return badRequest("Trạng thái công việc không hợp lệ.");
      patch.status = body.status;
    }
    if ("actualMinutes" in body) {
      patch.actualMinutes = body.actualMinutes ? Number(body.actualMinutes) : null;
    }
    if ("unitPrice" in body) patch.unitPrice = Number(body.unitPrice) || 0;
    if ("quantity" in body) {
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) return badRequest("Số lượng không hợp lệ.");
      patch.quantity = quantity;
    }

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    try {
      return NextResponse.json({ labor: await updateLabor(laborId, patch) });
    } catch (error) {
      if (error instanceof OrderLockedError) return conflict(error.message);
      throw error;
    }
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { laborId } = await params;
    try {
      await removeLabor(laborId);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof OrderLockedError) return conflict(error.message);
      throw error;
    }
  });
}
