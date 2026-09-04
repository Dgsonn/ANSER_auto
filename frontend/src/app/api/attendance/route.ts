import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireEmployeeLink } from "@/server/session";
import { AlreadyClockedInError, clockIn, getOpenAttendance, listRecentAttendance } from "@/server/store/attendance";

export const dynamic = "force-dynamic";

// Chấm công luôn tự suy employeeId từ phiên đăng nhập (users.employeeId), KHÔNG nhận
// employeeId từ body — nếu không, ai cũng chấm công hộ được người khác.
export async function GET() {
  return handle(async () => {
    const link = await requireEmployeeLink();
    if (!link) return unauthorized();
    if (!link.employee) return badRequest("Tài khoản chưa liên kết hồ sơ nhân sự.");

    const [open, recent] = await Promise.all([
      getOpenAttendance(link.employee.id),
      listRecentAttendance(link.employee.id),
    ]);
    return NextResponse.json({ open: open ?? null, recent });
  });
}

export async function POST() {
  return handle(async () => {
    const link = await requireEmployeeLink();
    if (!link) return unauthorized();
    if (!link.employee) return badRequest("Tài khoản chưa liên kết hồ sơ nhân sự.");

    try {
      const log = await clockIn(link.employee.id);
      return NextResponse.json({ log }, { status: 201 });
    } catch (error) {
      if (error instanceof AlreadyClockedInError) return conflict(error.message);
      throw error;
    }
  });
}
