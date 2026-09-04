import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { attendanceLogs, employees } from "@/server/db/schema";

export type AttendanceLog = typeof attendanceLogs.$inferSelect;

export class AlreadyClockedInError extends Error {}
export class NotClockedInError extends Error {}

export async function getOpenAttendance(employeeId: string): Promise<AttendanceLog | undefined> {
  const rows = await db
    .select()
    .from(attendanceLogs)
    .where(and(eq(attendanceLogs.employeeId, employeeId), isNull(attendanceLogs.clockOutAt)))
    .limit(1);
  return rows[0];
}

export async function clockIn(employeeId: string): Promise<AttendanceLog> {
  if (await getOpenAttendance(employeeId)) {
    throw new AlreadyClockedInError("Đang trong ca làm — hãy Ra ca trước khi vào ca mới.");
  }
  const [log] = await db.insert(attendanceLogs).values({ employeeId }).returning();
  return log;
}

export async function clockOut(employeeId: string, note?: string | null): Promise<AttendanceLog> {
  const open = await getOpenAttendance(employeeId);
  if (!open) throw new NotClockedInError("Chưa vào ca — không có ca nào đang mở để ra ca.");

  const [log] = await db
    .update(attendanceLogs)
    .set({ clockOutAt: new Date(), note: note ?? open.note })
    .where(eq(attendanceLogs.id, open.id))
    .returning();
  return log;
}

// Gần nhất trước, đủ cho màn hình tự chấm công của một nhân sự xem lại vài ca gần đây.
export async function listRecentAttendance(employeeId: string, limit = 20): Promise<AttendanceLog[]> {
  return db
    .select()
    .from(attendanceLogs)
    .where(eq(attendanceLogs.employeeId, employeeId))
    .orderBy(desc(attendanceLogs.clockInAt))
    .limit(limit);
}

export const ATTENDANCE_SUMMARY_PERIODS = ["day", "week", "month"] as const;
export type AttendanceSummaryPeriod = (typeof ATTENDANCE_SUMMARY_PERIODS)[number];

function periodStart(period: AttendanceSummaryPeriod): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "day") return start;
  const days = period === "week" ? 7 : 30;
  return new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
}

export type AttendanceSummaryRow = {
  employeeId: string;
  employeeName: string;
  position: string | null;
  shiftCount: number;
  totalMinutes: number;
  clockedInNow: boolean;
};

// Dành cho kế toán/quản lý xem tổng giờ công để tính lương — CHỈ hiện giờ công, không tự
// ra số tiền: quy tắc lương thật (thưởng, phụ cấp, trừ phạt...) có thể phức tạp hơn
// giờ công × đơn giá đơn thuần, tự tính sẵn dễ sai hơn là để người tính tay dựa trên số này.
//
// Chỉ cộng ca ĐÃ ra ca (`clockOutAt` khác null) vào tổng — ca đang mở cộng vào tổng theo
// từng giây sẽ khiến số trên màn hình đổi liên tục trong khi xem, gây hiểu lầm là dữ liệu
// không ổn định. Ca đang mở vẫn hiện riêng qua cờ `clockedInNow`.
export async function getAttendanceSummary(
  period: AttendanceSummaryPeriod,
): Promise<AttendanceSummaryRow[]> {
  const from = periodStart(period);

  // "Đang trong ca" phải là trạng thái THẬT NGAY LÚC NÀY, không lọc theo kỳ báo cáo — một
  // ca vào từ trước mốc `from` (vd chọn kỳ "Hôm nay" nhưng vào ca từ hôm qua, chưa ra ca)
  // vẫn phải hiện đang mở. Tách riêng khỏi câu tổng hợp giờ công (có lọc theo kỳ) thay vì
  // nhét chung một JOIN — nhét chung sẽ vô tình lọc mất các ca mở từ trước kỳ.
  const openRows = await db
    .select({ employeeId: attendanceLogs.employeeId })
    .from(attendanceLogs)
    .where(isNull(attendanceLogs.clockOutAt));
  const clockedInIds = new Set(openRows.map((r) => r.employeeId));

  const rows = await db
    .select({
      employeeId: employees.id,
      employeeName: employees.name,
      position: employees.position,
      shiftCount: sql<number>`count(${attendanceLogs.id}) filter (where ${attendanceLogs.clockOutAt} is not null)::int`,
      totalMinutes: sql<number>`coalesce(sum(extract(epoch from (${attendanceLogs.clockOutAt} - ${attendanceLogs.clockInAt})) / 60) filter (where ${attendanceLogs.clockOutAt} is not null), 0)::int`,
    })
    .from(employees)
    .leftJoin(
      attendanceLogs,
      and(eq(attendanceLogs.employeeId, employees.id), gte(attendanceLogs.clockInAt, from)),
    )
    .where(eq(employees.active, true))
    .groupBy(employees.id, employees.name, employees.position)
    .orderBy(employees.name);

  return rows.map((row) => ({ ...row, clockedInNow: clockedInIds.has(row.employeeId) }));
}
