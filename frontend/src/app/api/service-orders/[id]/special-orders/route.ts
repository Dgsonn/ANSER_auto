import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { createSpecialOrder, listSpecialOrders } from "@/server/store/specialOrders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    return NextResponse.json({ specialOrders: await listSpecialOrders(id) });
  });
}

// Ghi nhận một khoản phụ tùng phải đặt ngoài (không có sẵn trong kho) cho lệnh này.
// Chưa tính vào tổng tiền lệnh — chỉ tính khi hàng về và được "tính vào hoá đơn"
// (POST .../special-orders/[specialId]/bill). Xem chú thích bảng trong schema.ts.
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("Thiếu tên phụ tùng cần đặt.");

    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return badRequest("Số lượng phải là số nguyên lớn hơn 0.");
    }

    const specialOrder = await createSpecialOrder({
      serviceOrderId: id,
      name,
      supplier: body.supplier?.trim() || null,
      unit: body.unit?.trim() || "Cái",
      quantity,
      estimatedCost: body.estimatedCost ? Number(body.estimatedCost) : null,
      note: body.note?.trim() || null,
    });

    return NextResponse.json({ specialOrder }, { status: 201 });
  });
}
