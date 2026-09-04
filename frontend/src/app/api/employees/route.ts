import { NextResponse } from "next/server";
import { badRequest, forbidden, handle, unauthorized } from "@/server/api";
import { requireManager, requireUser } from "@/server/session";
import { createEmployee, listEmployees } from "@/server/store/employees";

export const dynamic = "force-dynamic";

// Đọc thì mọi người dùng đã đăng nhập đều được: danh sách nhân sự là dropdown chọn cố vấn
// dịch vụ / kỹ thuật viên trên lệnh sửa chữa, chặn ở đây là chặn luôn việc giao việc.
export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    return NextResponse.json({
      employees: await listEmployees({
        branchId: url.searchParams.get("branchId") ?? undefined,
        activeOnly: url.searchParams.get("activeOnly") === "1",
      }),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireManager())) return forbidden("Chỉ quản lý trở lên mới thêm được nhân sự.");

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("Thiếu tên nhân sự.");

    const employee = await createEmployee({
      name,
      position: body.position?.trim() || null,
      specialty: body.specialty?.trim() || null,
      hourlyCost: body.hourlyCost ? Number(body.hourlyCost) : null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      hireDate: body.hireDate ? new Date(body.hireDate) : null,
      branchId: body.branchId || null,
      note: body.note?.trim() || null,
    });

    return NextResponse.json({ employee }, { status: 201 });
  });
}
