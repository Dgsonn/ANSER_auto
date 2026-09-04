import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { listBranches } from "@/server/store/branches";
import { suggestNextCode } from "@/server/store/codes";
import { createPart, DuplicatePartCodeError, listParts } from "@/server/store/parts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    const list = await listParts({
      search: url.searchParams.get("search") ?? undefined,
      branchId: url.searchParams.get("branchId") ?? undefined,
    });
    const all = await listParts();
    return NextResponse.json({
      parts: list,
      branches: await listBranches(),
      suggestedCode: suggestNextCode("PT", all.map((p) => p.code)),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const body = await request.json().catch(() => ({}));

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const branchId = typeof body.branchId === "string" ? body.branchId : "";
    if (!code || !name || !category) return badRequest("Thiếu mã, tên hoặc nhóm phụ tùng.");
    if (!branchId) return badRequest("Thiếu chi nhánh.");

    try {
      const part = await createPart({
        code,
        name,
        category,
        branchId,
        oemNumber: body.oemNumber?.trim() || null,
        unit: body.unit?.trim() || "Cái",
        price: Number(body.price) || 0,
        // `null` = chưa biết giá vốn, khác 0 = miễn phí. Chỉ đặt khi người dùng thực sự nhập.
        cost: body.cost ? Number(body.cost) : null,
        minStock: body.minStock ? Number(body.minStock) : null,
        location: body.location?.trim() || null,
      });
      return NextResponse.json({ part }, { status: 201 });
    } catch (error) {
      if (error instanceof DuplicatePartCodeError) return conflict(error.message);
      throw error;
    }
  });
}
