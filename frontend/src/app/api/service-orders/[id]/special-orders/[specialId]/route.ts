import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { cancelSpecialOrder, markArrived, SpecialOrderStateError } from "@/server/store/specialOrders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; specialId: string }> };

// Chỉ dùng để đổi trạng thái (đã về hàng / huỷ) — chuyển thành dòng phụ tùng thật trên
// hoá đơn là một hành động riêng, xem POST .../special-orders/[specialId]/bill.
export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { specialId } = await params;
    const body = await request.json().catch(() => ({}));

    try {
      if (body.status === "arrived") {
        const specialOrder = await markArrived(specialId, {
          actualCost: body.actualCost ? Number(body.actualCost) : null,
        });
        return NextResponse.json({ specialOrder });
      }
      if (body.status === "cancelled") {
        const specialOrder = await cancelSpecialOrder(specialId);
        return NextResponse.json({ specialOrder });
      }
      return badRequest('Chỉ nhận status "arrived" hoặc "cancelled" ở endpoint này.');
    } catch (error) {
      if (error instanceof SpecialOrderStateError) return conflict(error.message);
      throw error;
    }
  });
}
