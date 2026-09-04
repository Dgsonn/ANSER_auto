import { NextResponse } from "next/server";
import { forbidden, handle, unauthorized } from "@/server/api";
import { requireUser, requirePayrollViewer } from "@/server/session";
import {
  ATTENDANCE_SUMMARY_PERIODS,
  getAttendanceSummary,
  type AttendanceSummaryPeriod,
} from "@/server/store/attendance";

export const dynamic = "force-dynamic";

// Tổng hợp giờ công toàn bộ nhân sự — chỉ quản lý/admin hoặc tài khoản luồng kế toán được
// xem (xem requirePayrollViewer()). Đây là dữ liệu để tính lương, khác trang "Chấm công"
// tự phục vụ của từng KTV (chỉ thấy ca của chính mình).
export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requirePayrollViewer())) {
      return forbidden("Chỉ quản lý hoặc kế toán mới xem được tổng hợp chấm công.");
    }

    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const period: AttendanceSummaryPeriod = (
      ATTENDANCE_SUMMARY_PERIODS as readonly string[]
    ).includes(periodParam ?? "")
      ? (periodParam as AttendanceSummaryPeriod)
      : "month";

    return NextResponse.json({ period, rows: await getAttendanceSummary(period) });
  });
}
