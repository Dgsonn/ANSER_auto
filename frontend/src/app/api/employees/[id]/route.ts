import { NextResponse } from "next/server";
import { badRequest, conflict, forbidden, handle, notFound, unauthorized } from "@/server/api";
import { requireManager, requireUser } from "@/server/session";
import {
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
} from "@/server/store/employees";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireManager())) return forbidden("Chỉ quản lý trở lên mới sửa được nhân sự.");

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Parameters<typeof updateEmployee>[1] = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if ("position" in body) patch.position = body.position?.trim() || null;
    if ("specialty" in body) patch.specialty = body.specialty?.trim() || null;
    if ("phone" in body) patch.phone = body.phone?.trim() || null;
    if ("email" in body) patch.email = body.email?.trim() || null;
    if ("note" in body) patch.note = body.note?.trim() || null;
    if ("branchId" in body) patch.branchId = body.branchId || null;
    if ("active" in body) patch.active = Boolean(body.active);
    if ("hourlyCost" in body) patch.hourlyCost = body.hourlyCost ? Number(body.hourlyCost) : null;
    if ("hireDate" in body) patch.hireDate = body.hireDate ? new Date(body.hireDate) : null;

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    const employee = await updateEmployee(id, patch);
    if (!employee) return notFound("Không tìm thấy nhân sự.");
    return NextResponse.json({ employee });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireManager())) return forbidden("Chỉ quản lý trở lên mới xoá được nhân sự.");

    const { id } = await params;
    if (!(await getEmployeeById(id))) return notFound("Không tìm thấy nhân sự.");

    try {
      await deleteEmployee(id);
      return new NextResponse(null, { status: 204 });
    } catch {
      // Nhân sự đã được gán vào dòng công hoặc là cố vấn của lệnh nào đó thì FK sẽ chặn
      // (`set null` chỉ áp cho một số quan hệ). Gợi ý cách đúng thay vì báo lỗi DB thô.
      return conflict(
        "Nhân sự này đang gắn với lệnh sửa chữa nên không xoá được. Hãy bỏ tick 'Đang làm việc' để ẩn khỏi danh sách phân công.",
      );
    }
  });
}
