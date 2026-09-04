import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { badRequest, conflict, forbidden, handle, notFound, unauthorized } from "@/server/api";
import { requireAdmin, requireUser } from "@/server/session";
import { ASSIGNABLE_ROLES, findUserById, toPublicUser, updateUser } from "@/server/store/users";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Đổi role (chỉ staff/manager — không thăng admin qua đây, xem ASSIGNABLE_ROLES) và/hoặc
// gán/gỡ hồ sơ nhân sự liên kết. Đây là nơi DUY NHẤT quyết định một tài khoản vào luồng
// kế toán/KTV/quản lý nào — xem resolveUserFlow() trong session.ts.
export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireAdmin())) return forbidden("Chỉ quản trị viên mới sửa được tài khoản.");

    const { id } = await params;
    const target = await findUserById(id);
    if (!target) return notFound("Không tìm thấy tài khoản.");

    const body = await request.json().catch(() => ({}));
    const patch: Parameters<typeof updateUser>[1] = {};

    if ("role" in body) {
      if (!ASSIGNABLE_ROLES.includes(body.role)) {
        return badRequest("Chỉ gán được vai trò staff hoặc manager qua đây.");
      }
      patch.role = body.role;
    }

    if ("employeeId" in body) {
      const employeeId = body.employeeId || null;
      if (employeeId) {
        // Mỗi hồ sơ nhân sự chỉ nên gắn với đúng 1 tài khoản đăng nhập — gắn 2 tài
        // khoản vào cùng 1 nhân sự sẽ làm "khu vực nhận việc"/chấm công lẫn dữ liệu
        // của 2 người vào chung một luồng.
        const [taken] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.employeeId, employeeId))
          .limit(1);
        if (taken && taken.id !== id) {
          return conflict("Hồ sơ nhân sự này đã liên kết với một tài khoản khác.");
        }
      }
      patch.employeeId = employeeId;
    }

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    const updated = await updateUser(id, patch);
    return NextResponse.json({ user: updated ? toPublicUser(updated) : null });
  });
}
