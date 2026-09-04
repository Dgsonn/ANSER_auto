import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { createCustomer, listCustomers } from "@/server/store/customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json({ customers: await listCustomers(search) });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("Thiếu tên khách hàng.");

    const customer = await createCustomer({
      name,
      type: body.type === "company" ? "company" : "individual",
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      taxCode: body.taxCode?.trim() || null,
      note: body.note?.trim() || null,
    });

    return NextResponse.json({ customer }, { status: 201 });
  });
}
