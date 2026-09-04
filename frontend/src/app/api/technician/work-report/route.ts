import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireEmployeeLink } from "@/server/session";
import { listLaborsForTechnician } from "@/server/store/serviceOrders";

export const dynamic = "force-dynamic";

// Tổng hợp từ đúng nguồn dữ liệu của "Khu vực nhận việc" (listLaborsForTechnician) — số
// lượng việc nhỏ theo từng KTV nên gộp ở đây bằng JS, không cần thêm 1 câu SQL riêng.
export async function GET() {
  return handle(async () => {
    const link = await requireEmployeeLink();
    if (!link) return unauthorized();
    if (!link.employee) return badRequest("Tài khoản chưa liên kết hồ sơ nhân sự.");

    const jobs = await listLaborsForTechnician(link.employee.id);

    const totals = jobs.reduce(
      (acc, job) => {
        acc[job.status === "done" ? "done" : job.status === "in_progress" ? "inProgress" : "pending"] += 1;
        acc.totalActualMinutes += job.actualMinutes ?? 0;
        acc.totalStandardMinutes += job.standardMinutes ?? 0;
        return acc;
      },
      { done: 0, inProgress: 0, pending: 0, totalActualMinutes: 0, totalStandardMinutes: 0 },
    );

    const doneJobs = jobs.filter((j) => j.status === "done");

    return NextResponse.json({ totals, doneJobs });
  });
}
