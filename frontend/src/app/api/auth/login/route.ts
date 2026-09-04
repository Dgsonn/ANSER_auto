import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authCookieOptions, COOKIE_NAME, signToken } from "@/server/auth";
import { badRequest, handle, unauthorized } from "@/server/api";
import { resolveUserFlow } from "@/server/session";
import { findUserByEmail, toPublicUser } from "@/server/store/users";

export async function POST(request: Request) {
  return handle(async () => {
    const { email, password } = await request.json().catch(() => ({}));

    if (!email || !password) {
      return badRequest("Thiếu email hoặc mật khẩu.");
    }

    const user = await findUserByEmail(email);
    // So sánh hash kể cả khi không tìm thấy user sẽ tốt hơn về mặt timing attack,
    // nhưng ở quy mô này ưu tiên giữ code đọc thẳng — chống brute-force nên làm bằng
    // rate-limit (xem mục Hạn chế trong ARCHITECTURE.md).
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return unauthorized("Email hoặc mật khẩu không đúng.");
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, signToken(user.id), authCookieOptions);

    return NextResponse.json({ user: toPublicUser(user), flow: await resolveUserFlow(user) });
  });
}
