import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { getServiceById } from "@/server/store/services";
import { addLabor, OrderLockedError } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return badRequest("Số lượng phải là số nguyên lớn hơn 0.");
    }

    // Chọn từ bảng giá thì lấy tên/giá/định mức từ đó và SNAPSHOT vào dòng công — sửa
    // bảng giá sau này không được làm đổi lệnh đã lập.
    let name = typeof body.name === "string" ? body.name.trim() : "";
    let unitPrice = Number(body.unitPrice) || 0;
    let standardMinutes: number | null = body.standardMinutes ? Number(body.standardMinutes) : null;

    if (body.serviceId) {
      const service = await getServiceById(body.serviceId);
      if (!service) return badRequest("Không tìm thấy hạng mục dịch vụ.");
      name = name || service.name;
      if (!("unitPrice" in body)) unitPrice = service.laborPrice;
      standardMinutes = standardMinutes ?? service.standardMinutes;
    }

    if (!name) return badRequest("Thiếu tên hạng mục công việc.");

    try {
      const labor = await addLabor(id, {
        serviceId: body.serviceId || null,
        name,
        // Không truyền -> addLabor() tự điền bằng xưởng tiếp nhận của lệnh. Truyền rỗng
        // ("") nghĩa là cố tình để trống, không phải "chưa chọn" — phân biệt bằng `in`.
        branchId: "branchId" in body ? body.branchId || null : undefined,
        technicianId: body.technicianId || null,
        unitPrice,
        quantity,
        standardMinutes,
        note: body.note?.trim() || null,
      });
      return NextResponse.json({ labor }, { status: 201 });
    } catch (error) {
      if (error instanceof OrderLockedError) return conflict(error.message);
      throw error;
    }
  });
}
