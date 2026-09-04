import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { badRequest, handle, unauthorized } from "@/server/api";
import { getSessionUser, resolveUserFlow } from "@/server/session";
import { toPublicUser, updateUser } from "@/server/store/users";

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    return NextResponse.json({ user: toPublicUser(user), flow: await resolveUserFlow(user) });
  });
}

// Sửa hồ sơ của chính mình: tên/SĐT và/hoặc đổi mật khẩu.
export async function PATCH(request: Request) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { firstName, lastName, phone, currentPassword, newPassword } = await request
      .json()
      .catch(() => ({}));

    const patch: Parameters<typeof updateUser>[1] = {};
    if (typeof firstName === "string" && firstName.trim()) patch.firstName = firstName.trim();
    if (typeof lastName === "string" && lastName.trim()) patch.lastName = lastName.trim();
    if (typeof phone === "string") patch.phone = phone.trim() || null;

    if (newPassword) {
      if (newPassword.length < 6) return badRequest("Mật khẩu mới phải có ít nhất 6 ký tự.");
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return badRequest("Mật khẩu hiện tại không đúng.");
      }
      patch.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    const updated = await updateUser(user.id, patch);
    return NextResponse.json({ user: updated ? toPublicUser(updated) : null });
  });
}
