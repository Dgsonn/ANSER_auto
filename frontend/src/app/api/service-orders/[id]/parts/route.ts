import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { InsufficientStockError } from "@/server/store/parts";
import { addPart, CrossBranchError, OrderLockedError } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (!body.partId) return badRequest("Thiếu phụ tùng.");
    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return badRequest("Số lượng phải là số nguyên lớn hơn 0.");
    }

    try {
      const line = await addPart(id, {
        partId: body.partId,
        quantity,
        unitPrice: "unitPrice" in body ? Number(body.unitPrice) || 0 : undefined,
      });
      return NextResponse.json({ line }, { status: 201 });
    } catch (error) {
      if (error instanceof InsufficientStockError) return conflict(error.message);
      if (error instanceof CrossBranchError) return conflict(error.message);
      if (error instanceof OrderLockedError) return conflict(error.message);
      throw error;
    }
  });
}
