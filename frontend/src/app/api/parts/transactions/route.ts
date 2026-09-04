import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import {
  createPartTransaction,
  InsufficientStockError,
  listPartTransactions,
} from "@/server/store/parts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    return NextResponse.json({
      transactions: await listPartTransactions({
        partId: url.searchParams.get("partId") ?? undefined,
        limit: Number(url.searchParams.get("limit")) || 100,
      }),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const body = await request.json().catch(() => ({}));

    if (body.type !== "import" && body.type !== "export") {
      return badRequest("Loại phiếu phải là nhập hoặc xuất.");
    }
    if (!body.partId) return badRequest("Thiếu phụ tùng.");

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return badRequest("Số lượng phải là số nguyên lớn hơn 0.");
    }

    try {
      const transaction = await createPartTransaction({
        partId: body.partId,
        type: body.type,
        quantity,
        unitCost: body.unitCost ? Number(body.unitCost) : null,
        counterparty: body.counterparty?.trim() || null,
        note: body.note?.trim() || null,
      });
      return NextResponse.json({ transaction }, { status: 201 });
    } catch (error) {
      if (error instanceof InsufficientStockError) return conflict(error.message);
      throw error;
    }
  });
}
