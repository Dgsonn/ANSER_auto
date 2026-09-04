import { NextResponse } from "next/server";
import { badRequest, conflict, forbidden, handle, unauthorized } from "@/server/api";
import { requireManager, requireUser } from "@/server/session";
import { createBranch, listBranches } from "@/server/store/branches";

export async function GET() {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    return NextResponse.json({ branches: await listBranches() });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireManager())) return forbidden("Chỉ quản lý trở lên mới tạo được chi nhánh.");

    const { name, address, phone, notificationEmail } = await request.json().catch(() => ({}));
    if (!name || typeof name !== "string") return badRequest("Thiếu tên chi nhánh.");

    try {
      const branch = await createBranch({ name: name.trim(), address, phone, notificationEmail });
      return NextResponse.json({ branch }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("đã tồn tại")) {
        return conflict(error.message);
      }
      throw error;
    }
  });
}
