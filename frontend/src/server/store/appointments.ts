import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { appointments, branches, customers, vehicles } from "@/server/db/schema";

export type Appointment = typeof appointments.$inferSelect;

export type AppointmentListItem = {
  id: string;
  branchId: string;
  branchName: string;
  customerId: string | null;
  vehicleId: string | null;
  scheduledAt: Date;
  status: string;
  source: string;
  requestNote: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  plate: string | null;
  vehicleLabel: string | null;
  // SĐT chi nhánh — email nhắc lịch cần nó để khách gọi lại đổi/huỷ hẹn.
  branchPhone: string | null;
};

// Liên hệ: ưu tiên hồ sơ khách đã lưu, rơi về thông tin lễ tân gõ tay khi khách gọi điện
// mà chưa có hồ sơ (xem chú thích cột `contactName`/`contactPhone` trong schema).
function toListItem(row: {
  id: string;
  branchId: string;
  scheduledAt: Date;
  status: string;
  source: string;
  requestNote: string | null;
  customerId: string | null;
  vehicleId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  plateText: string | null;
  branchName: string;
  branchPhone: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  licensePlate: string | null;
  make: string | null;
  model: string | null;
}): AppointmentListItem {
  return {
    id: row.id,
    branchId: row.branchId,
    branchName: row.branchName,
    branchPhone: row.branchPhone,
    customerId: row.customerId,
    vehicleId: row.vehicleId,
    scheduledAt: row.scheduledAt,
    status: row.status,
    source: row.source,
    requestNote: row.requestNote,
    contactName: row.customerName ?? row.contactName,
    contactPhone: row.customerPhone ?? row.contactPhone,
    contactEmail: row.customerEmail,
    plate: row.licensePlate ?? row.plateText,
    vehicleLabel: row.make && row.model ? `${row.make} ${row.model}` : null,
  };
}

const listSelect = {
  id: appointments.id,
  branchId: appointments.branchId,
  scheduledAt: appointments.scheduledAt,
  status: appointments.status,
  source: appointments.source,
  requestNote: appointments.requestNote,
  customerId: appointments.customerId,
  vehicleId: appointments.vehicleId,
  contactName: appointments.contactName,
  contactPhone: appointments.contactPhone,
  plateText: appointments.plateText,
  branchName: branches.name,
  branchPhone: branches.phone,
  customerName: customers.name,
  customerPhone: customers.phone,
  customerEmail: customers.email,
  licensePlate: vehicles.licensePlate,
  make: vehicles.make,
  model: vehicles.model,
};

function baseQuery() {
  return db
    .select(listSelect)
    .from(appointments)
    .innerJoin(branches, eq(appointments.branchId, branches.id))
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(vehicles, eq(appointments.vehicleId, vehicles.id));
}

export async function listAppointments(options?: {
  from?: Date;
  to?: Date;
  status?: string;
}): Promise<AppointmentListItem[]> {
  const conditions = [];
  if (options?.from) conditions.push(gte(appointments.scheduledAt, options.from));
  if (options?.to) conditions.push(lte(appointments.scheduledAt, options.to));
  if (options?.status) conditions.push(eq(appointments.status, options.status));

  const rows = await baseQuery()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(appointments.scheduledAt));

  return rows.map(toListItem);
}

// Lịch hẹn sắp tới trong khoảng N giờ, chỉ lấy hẹn còn hiệu lực (chờ xác nhận / đã xác
// nhận) — nhắc khách đã huỷ hoặc đã tới xưởng là phản tác dụng.
export async function listUpcomingAppointments(withinHours = 24): Promise<AppointmentListItem[]> {
  const now = new Date();
  const limit = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

  const rows = await baseQuery()
    .where(
      and(
        gte(appointments.scheduledAt, now),
        lte(appointments.scheduledAt, limit),
        inArray(appointments.status, ["pending", "confirmed"]),
      ),
    )
    .orderBy(asc(appointments.scheduledAt));

  return rows.map(toListItem);
}

export type AppointmentInput = {
  branchId: string;
  scheduledAt: Date;
  customerId?: string | null;
  vehicleId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  plateText?: string | null;
  source?: string;
  requestNote?: string | null;
  status?: string;
};

export async function createAppointment(input: AppointmentInput) {
  const [appointment] = await db
    .insert(appointments)
    .values({ ...input, source: input.source ?? "phone", status: input.status ?? "pending" })
    .returning();
  return appointment;
}

export async function updateAppointment(id: string, patch: Partial<AppointmentInput>) {
  const [appointment] = await db
    .update(appointments)
    .set(patch)
    .where(eq(appointments.id, id))
    .returning();
  return appointment;
}

export async function deleteAppointment(id: string) {
  await db.delete(appointments).where(eq(appointments.id, id));
}

export async function getAppointmentById(id: string): Promise<Appointment | undefined> {
  const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return rows[0];
}
