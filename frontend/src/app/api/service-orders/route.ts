import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { createServiceOrder, listServiceOrders } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    return NextResponse.json({
      orders: await listServiceOrders({
        search: url.searchParams.get("search") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        activeOnly: url.searchParams.get("activeOnly") === "1",
      }),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const body = await request.json().catch(() => ({}));

    if (!body.vehicleId) return badRequest("Thiếu xe tiếp nhận.");
    if (!body.branchId) return badRequest("Thiếu chi nhánh.");

    const order = await createServiceOrder({
      branchId: body.branchId,
      vehicleId: body.vehicleId,
      customerId: body.customerId || null,
      advisorId: body.advisorId || null,
      odometerIn: body.odometerIn ? Number(body.odometerIn) : null,
      customerComplaint: body.customerComplaint?.trim() || null,
      promisedAt: body.promisedAt ? new Date(body.promisedAt) : null,
      note: body.note?.trim() || null,
    });

    return NextResponse.json({ order }, { status: 201 });
  });
}
