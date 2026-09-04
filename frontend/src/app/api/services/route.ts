import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { suggestNextCode } from "@/server/store/codes";
import {
  createService,
  DuplicateServiceCodeError,
  listServices,
} from "@/server/store/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    const list = await listServices({
      search: url.searchParams.get("search") ?? undefined,
      activeOnly: url.searchParams.get("activeOnly") === "1",
    });
    // Trả kèm mã gợi ý để form không phải tự tính — mã do người dùng đặt, đây chỉ là
    // giá trị điền sẵn cho tiện (xem `suggestNextCode`).
    const all = await listServices();
    return NextResponse.json({
      services: list,
      suggestedCode: suggestNextCode("DV", all.map((s) => s.code)),
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
    if (!code || !name || !category) return badRequest("Thiếu mã, tên hoặc nhóm dịch vụ.");

    const standardMinutes = Number(body.standardMinutes);
    if (!Number.isFinite(standardMinutes) || standardMinutes <= 0) {
      return badRequest("Giờ công định mức phải lớn hơn 0.");
    }

    try {
      const service = await createService({
        code,
        name,
        category,
        standardMinutes,
        laborPrice: Number(body.laborPrice) || 0,
        description: body.description?.trim() || null,
        active: body.active !== false,
      });
      return NextResponse.json({ service }, { status: 201 });
    } catch (error) {
      if (error instanceof DuplicateServiceCodeError) return conflict(error.message);
      throw error;
    }
  });
}
