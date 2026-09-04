import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireEmployeeLink } from "@/server/session";
import { clockOut, NotClockedInError } from "@/server/store/attendance";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const link = await requireEmployeeLink();
    if (!link) return unauthorized();
    if (!link.employee) return badRequest("Tài khoản chưa liên kết hồ sơ nhân sự.");

    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === "string" ? body.note.trim() || null : undefined;

    try {
      const log = await clockOut(link.employee.id, note);
      return NextResponse.json({ log });
    } catch (error) {
      if (error instanceof NotClockedInError) return conflict(error.message);
      throw error;
    }
  });
}
