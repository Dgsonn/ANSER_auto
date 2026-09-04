import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { employees, users } from "@/server/db/schema";
import { badRequest, conflict, forbidden, handle, unauthorized } from "@/server/api";
import { requireAdmin, requireUser } from "@/server/session";
import { ASSIGNABLE_ROLES, createUser, findUserByEmail, toPublicUser } from "@/server/store/users";

export const dynamic = "force-dynamic";

// Chỉ admin xem được — danh sách này lộ email của toàn bộ tài khoản trong gara, và là nơi
// duy nhất gán "luồng" (kế toán/KTV) cho một tài khoản qua employeeId. Xem resolveUserFlow()
// trong session.ts.
export async function GET() {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireAdmin())) return forbidden("Chỉ quản trị viên mới xem được danh sách tài khoản.");

    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        employeeId: users.employeeId,
        employeeName: employees.name,
        employeePosition: employees.position,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(employees, eq(users.employeeId, employees.id))
      .orderBy(users.firstName);

    return NextResponse.json({ users: rows });
  });
}

// Quản lý cấp tài khoản trực tiếp cho nhân viên (mật khẩu tạm do quản lý tự đặt) — khác
// /api/auth/register (public, tự đăng ký): route này cần requireAdmin() và cho gán luôn
// role + employeeId ngay lúc tạo, không phải tạo xong rồi sửa lại 2 bước.
export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireAdmin())) return forbidden("Chỉ quản trị viên mới cấp được tài khoản.");

    const body = await request.json().catch(() => ({}));
    const { firstName, lastName, email, phone, password, role, employeeId } = body;

    if (!firstName || !lastName || !email || !password) {
      return badRequest("Thiếu thông tin bắt buộc.");
    }
    if (password.length < 6) {
      return badRequest("Mật khẩu phải có ít nhất 6 ký tự.");
    }
    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      return badRequest("Chỉ gán được vai trò staff hoặc manager qua đây.");
    }
    if (await findUserByEmail(email)) {
      return conflict("Email đã được sử dụng.");
    }
    if (employeeId) {
      // Cùng ràng buộc với PATCH /api/users/[id]: mỗi hồ sơ nhân sự chỉ nên gắn 1 tài khoản.
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.employeeId, employeeId))
        .limit(1);
      if (taken) return conflict("Hồ sơ nhân sự này đã liên kết với một tài khoản khác.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      passwordHash,
      role: role || undefined,
      employeeId: employeeId || undefined,
    });

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  });
}
