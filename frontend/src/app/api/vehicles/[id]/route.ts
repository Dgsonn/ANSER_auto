import { NextResponse } from "next/server";
import { badRequest, conflict, handle, notFound, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import {
  deleteVehicle,
  DuplicatePlateError,
  getVehicleById,
  listVehicleHistory,
  updateVehicle,
  type VehicleInput,
} from "@/server/store/vehicles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const vehicle = await getVehicleById(id);
    if (!vehicle) return notFound("Không tìm thấy xe.");
    return NextResponse.json({ vehicle, history: await listVehicleHistory(id) });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const patch: Partial<VehicleInput> = {};
    if (typeof body.licensePlate === "string" && body.licensePlate.trim()) {
      patch.licensePlate = body.licensePlate.trim();
    }
    if (typeof body.make === "string" && body.make.trim()) patch.make = body.make.trim();
    if (typeof body.model === "string" && body.model.trim()) patch.model = body.model.trim();
    if ("customerId" in body) patch.customerId = body.customerId || null;
    if ("vin" in body) patch.vin = body.vin?.trim() || null;
    if ("color" in body) patch.color = body.color?.trim() || null;
    if ("engineNumber" in body) patch.engineNumber = body.engineNumber?.trim() || null;
    if ("fuelType" in body) patch.fuelType = body.fuelType || null;
    if ("transmission" in body) patch.transmission = body.transmission || null;
    if ("note" in body) patch.note = body.note?.trim() || null;
    if ("year" in body) patch.year = body.year ? Number(body.year) : null;
    if ("odometer" in body) {
      patch.odometer = body.odometer !== "" && body.odometer !== null ? Number(body.odometer) : null;
    }
    if ("nextServiceAt" in body) {
      patch.nextServiceAt = body.nextServiceAt ? new Date(body.nextServiceAt) : null;
    }
    if ("nextServiceOdometer" in body) {
      patch.nextServiceOdometer = body.nextServiceOdometer ? Number(body.nextServiceOdometer) : null;
    }

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    try {
      const vehicle = await updateVehicle(id, patch);
      if (!vehicle) return notFound("Không tìm thấy xe.");
      return NextResponse.json({ vehicle });
    } catch (error) {
      if (error instanceof DuplicatePlateError) return conflict(error.message);
      throw error;
    }
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    if (!(await getVehicleById(id))) return notFound("Không tìm thấy xe.");

    // Xe đã từng vào xưởng thì không cho xoá: `service_orders.vehicleId` là NOT NULL nên
    // xoá sẽ lỗi FK ở tầng DB — chặn ở đây để trả thông báo người dùng hiểu được thay vì
    // một lỗi Postgres thô.
    const history = await listVehicleHistory(id);
    if (history.length > 0) {
      return conflict(
        `Xe này có ${history.length} lệnh sửa chữa trong lịch sử nên không xoá được. Hãy sửa lại thông tin xe thay vì xoá.`,
      );
    }

    await deleteVehicle(id);
    return new NextResponse(null, { status: 204 });
  });
}
