import { NextResponse } from "next/server";
import { badRequest, handle, notFound, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import {
  deleteCustomer,
  getCustomerById,
  listCustomerVehicles,
  updateCustomer,
} from "@/server/store/customers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const customer = await getCustomerById(id);
    if (!customer) return notFound("Không tìm thấy khách hàng.");
    return NextResponse.json({ customer, vehicles: await listCustomerVehicles(id) });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (body.type === "company" || body.type === "individual") patch.type = body.type;
    for (const field of ["phone", "email", "address", "taxCode", "note"] as const) {
      if (field in body) patch[field] = body[field]?.trim() || null;
    }
    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    const customer = await updateCustomer(id, patch);
    if (!customer) return notFound("Không tìm thấy khách hàng.");
    return NextResponse.json({ customer });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    if (!(await getCustomerById(id))) return notFound("Không tìm thấy khách hàng.");
    await deleteCustomer(id);
    return new NextResponse(null, { status: 204 });
  });
}
