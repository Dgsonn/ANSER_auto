import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { billSpecialOrder, SpecialOrderStateError } from "@/server/store/specialOrders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; specialId: string }> };

// Chuyển khoản đặt ngoài đã về hàng thành 1 dòng phụ tùng thật trên lệnh — điểm DUY NHẤT
// nó bắt đầu tính vào tổng tiền. Xem lý do tách hành động này ra riêng trong specialOrders.ts.
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { specialId } = await params;
    const body = await request.json().catch(() => ({}));

    const sellPrice = Number(body.sellPrice);
    if (!Number.isFinite(sellPrice) || sellPrice < 0) {
      return badRequest("Giá bán cho khách không hợp lệ.");
    }

    try {
      const line = await billSpecialOrder(specialId, { sellPrice });
      return NextResponse.json({ line }, { status: 201 });
    } catch (error) {
      if (error instanceof SpecialOrderStateError) return conflict(error.message);
      throw error;
    }
  });
}
