import { NextResponse } from "next/server";
import { badRequest, handle, notFound, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { recordPayment } from "@/server/store/invoices";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Ghi nhận thanh toán. `paidAmount` là số đã thu LUỸ KẾ (xem `recordPayment`).
export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const paidAmount = Number(body.paidAmount);
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      return badRequest("Số tiền không hợp lệ.");
    }

    const invoice = await recordPayment(id, {
      paidAmount,
      paymentMethod: body.paymentMethod || null,
    });
    if (!invoice) return notFound("Không tìm thấy hoá đơn.");
    return NextResponse.json({ invoice });
  });
}
