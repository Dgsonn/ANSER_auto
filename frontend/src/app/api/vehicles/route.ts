import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { createVehicle, DuplicatePlateError, listVehicles } from "@/server/store/vehicles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json({ vehicles: await listVehicles(search) });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const licensePlate = typeof body.licensePlate === "string" ? body.licensePlate.trim() : "";
    const make = typeof body.make === "string" ? body.make.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";

    if (!licensePlate) return badRequest("Thiếu biển số.");
    if (!make || !model) return badRequest("Thiếu hãng hoặc dòng xe.");

    try {
      const vehicle = await createVehicle({
        customerId: body.customerId || null,
        licensePlate,
        make,
        model,
        vin: body.vin?.trim() || null,
        year: body.year ? Number(body.year) : null,
        color: body.color?.trim() || null,
        engineNumber: body.engineNumber?.trim() || null,
        fuelType: body.fuelType || null,
        transmission: body.transmission || null,
        odometer: body.odometer !== undefined && body.odometer !== "" ? Number(body.odometer) : null,
        note: body.note?.trim() || null,
      });
      return NextResponse.json({ vehicle }, { status: 201 });
    } catch (error) {
      if (error instanceof DuplicatePlateError) return conflict(error.message);
      throw error;
    }
  });
}
