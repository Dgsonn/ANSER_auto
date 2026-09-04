import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireEmployeeLink } from "@/server/session";
import { listLaborsForTechnician } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

// "Khu vực nhận việc" — chỉ xem việc ĐÃ được giao (technicianId = chính mình), không có
// endpoint tự nhận việc chưa gán ai (quyết định nghiệp vụ: thợ làm việc được quản đốc
// phân, không tự chọn — xem ARCHITECTURE.md).
export async function GET() {
  return handle(async () => {
    const link = await requireEmployeeLink();
    if (!link) return unauthorized();
    if (!link.employee) return badRequest("Tài khoản chưa liên kết hồ sơ nhân sự.");

    return NextResponse.json({ jobs: await listLaborsForTechnician(link.employee.id) });
  });
}
