import { NextResponse } from "next/server";
import { badRequest, forbidden, handle, notFound, unauthorized } from "@/server/api";
import { requireManager, requireUser } from "@/server/session";
import { getBranchById, updateBranch } from "@/server/store/branches";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const branch = await getBranchById(id);
    if (!branch) return notFound("Không tìm thấy chi nhánh.");
    return NextResponse.json({ branch });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireManager())) return forbidden("Chỉ quản lý trở lên mới sửa được chi nhánh.");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Chỉ đưa vào patch những field thực sự có mặt trong body: Drizzle `.set({})`
    // với toàn undefined sẽ sinh câu UPDATE rỗng và ném lỗi.
    const patch: Parameters<typeof updateBranch>[1] = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if ("address" in body) patch.address = body.address || null;
    if ("phone" in body) patch.phone = body.phone || null;
    if ("notificationEmail" in body) patch.notificationEmail = body.notificationEmail || null;
    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    const branch = await updateBranch(id, patch);
    if (!branch) return notFound("Không tìm thấy chi nhánh.");
    return NextResponse.json({ branch });
  });
}
