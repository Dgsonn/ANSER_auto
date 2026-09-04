import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authCookieOptions, COOKIE_NAME, signToken } from "@/server/auth";
import { badRequest, conflict, handle } from "@/server/api";
import { createUser, findUserByEmail, toPublicUser } from "@/server/store/users";

export async function POST(request: Request) {
  return handle(async () => {
    const { firstName, lastName, email, phone, password } = await request.json().catch(() => ({}));

    if (!firstName || !lastName || !email || !password) {
      return badRequest("Thiếu thông tin bắt buộc.");
    }
    if (password.length < 6) {
      return badRequest("Mật khẩu phải có ít nhất 6 ký tự.");
    }
    if (await findUserByEmail(email)) {
      return conflict("Email đã được sử dụng.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ firstName, lastName, email, phone, passwordHash });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, signToken(user.id), authCookieOptions);

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  });
}
