import { NextResponse } from "next/server";
import { badRequest, conflict, handle, notFound, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import {
  deleteService,
  DuplicateServiceCodeError,
  getServiceById,
  updateService,
  type ServiceInput,
} from "@/server/store/services";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Partial<ServiceInput> = {};
    if (typeof body.code === "string" && body.code.trim()) patch.code = body.code.trim().toUpperCase();
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.category === "string" && body.category.trim()) patch.category = body.category.trim();
    if ("description" in body) patch.description = body.description?.trim() || null;
    if ("active" in body) patch.active = Boolean(body.active);
    if ("laborPrice" in body) patch.laborPrice = Number(body.laborPrice) || 0;
    if ("standardMinutes" in body) {
      const minutes = Number(body.standardMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) return badRequest("Giờ công định mức phải lớn hơn 0.");
      patch.standardMinutes = minutes;
    }
    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    try {
      const service = await updateService(id, patch);
      if (!service) return notFound("Không tìm thấy hạng mục.");
      return NextResponse.json({ service });
    } catch (error) {
      if (error instanceof DuplicateServiceCodeError) return conflict(error.message);
      throw error;
    }
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    if (!(await getServiceById(id))) return notFound("Không tìm thấy hạng mục.");
    await deleteService(id);
    return new NextResponse(null, { status: 204 });
  });
}
