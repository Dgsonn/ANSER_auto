import { NextResponse } from "next/server";
import { badRequest, conflict, handle, notFound, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import {
  deletePart,
  DuplicatePartCodeError,
  getPartById,
  listPartTransactions,
  updatePart,
  type PartInput,
} from "@/server/store/parts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const part = await getPartById(id);
    if (!part) return notFound("Không tìm thấy phụ tùng.");
    return NextResponse.json({
      part,
      transactions: await listPartTransactions({ partId: id, limit: 50 }),
    });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Partial<PartInput> = {};
    if (typeof body.code === "string" && body.code.trim()) patch.code = body.code.trim().toUpperCase();
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.category === "string" && body.category.trim()) patch.category = body.category.trim();
    if (typeof body.branchId === "string" && body.branchId) patch.branchId = body.branchId;
    if (typeof body.unit === "string" && body.unit.trim()) patch.unit = body.unit.trim();
    if ("oemNumber" in body) patch.oemNumber = body.oemNumber?.trim() || null;
    if ("location" in body) patch.location = body.location?.trim() || null;
    if ("price" in body) patch.price = Number(body.price) || 0;
    if ("cost" in body) patch.cost = body.cost ? Number(body.cost) : null;
    if ("minStock" in body) patch.minStock = body.minStock ? Number(body.minStock) : null;

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    try {
      const part = await updatePart(id, patch);
      if (!part) return notFound("Không tìm thấy phụ tùng.");
      return NextResponse.json({ part });
    } catch (error) {
      if (error instanceof DuplicatePartCodeError) return conflict(error.message);
      throw error;
    }
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    if (!(await getPartById(id))) return notFound("Không tìm thấy phụ tùng.");

    // Có lịch sử nhập/xuất thì không cho xoá: `part_transactions.partId` là cascade nên
    // xoá phụ tùng sẽ xoá sạch lịch sử kho theo — mất dấu vết của hàng đã thực sự luân
    // chuyển, và không có cách nào lấy lại.
    const history = await listPartTransactions({ partId: id, limit: 1 });
    if (history.length > 0) {
      return conflict(
        "Phụ tùng này đã có lịch sử nhập/xuất kho nên không xoá được — xoá sẽ mất luôn lịch sử. Hãy đặt tồn về 0 nếu không dùng nữa.",
      );
    }

    await deletePart(id);
    return new NextResponse(null, { status: 204 });
  });
}
