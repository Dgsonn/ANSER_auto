import { asc, desc, eq, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { customers, serviceOrders, vehicles } from "@/server/db/schema";

export type Vehicle = typeof vehicles.$inferSelect;

export type VehicleListItem = Vehicle & {
  customerName: string | null;
  customerPhone: string | null;
  orderCount: number;
  lastVisitAt: Date | null;
};

// Biển số lưu chuẩn hoá: bỏ khoảng trắng/dấu chấm/gạch, viết hoa. Người nhập gõ
// "30A-123.45", "30a 12345", "30A12345" đều là một chiếc xe — không chuẩn hoá thì
// ràng buộc unique vô dụng và tra cứu theo biển số sẽ trượt đúng lúc cần nhất.
export function normalizePlate(plate: string) {
  return plate.replace(/[\s.\-_]/g, "").toUpperCase();
}

export async function listVehicles(search?: string): Promise<VehicleListItem[]> {
  const term = search?.trim();
  const where = term
    ? or(
        ilike(vehicles.licensePlate, `%${normalizePlate(term)}%`),
        ilike(vehicles.make, `%${term}%`),
        ilike(vehicles.model, `%${term}%`),
        ilike(vehicles.vin, `%${term}%`),
        ilike(customers.name, `%${term}%`),
      )
    : undefined;

  return db
    .select({
      id: vehicles.id,
      customerId: vehicles.customerId,
      licensePlate: vehicles.licensePlate,
      vin: vehicles.vin,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      engineNumber: vehicles.engineNumber,
      fuelType: vehicles.fuelType,
      transmission: vehicles.transmission,
      odometer: vehicles.odometer,
      nextServiceAt: vehicles.nextServiceAt,
      nextServiceOdometer: vehicles.nextServiceOdometer,
      note: vehicles.note,
      createdAt: vehicles.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      orderCount: sql<number>`(
        select count(*)::int from ${serviceOrders} where ${serviceOrders.vehicleId} = ${vehicles.id}
      )`,
      lastVisitAt: sql<Date | null>`(
        select max(${serviceOrders.receivedAt})
        from ${serviceOrders} where ${serviceOrders.vehicleId} = ${vehicles.id}
      )`,
    })
    .from(vehicles)
    .leftJoin(customers, eq(vehicles.customerId, customers.id))
    .where(where)
    .orderBy(asc(vehicles.licensePlate));
}

export async function getVehicleById(id: string): Promise<Vehicle | undefined> {
  const rows = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return rows[0];
}

export async function findVehicleByPlate(plate: string): Promise<Vehicle | undefined> {
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.licensePlate, normalizePlate(plate)))
    .limit(1);
  return rows[0];
}

// Lịch sử vào xưởng của một xe — thứ cố vấn dịch vụ mở ra đầu tiên khi khách quay lại.
export async function listVehicleHistory(vehicleId: string) {
  return db
    .select({
      id: serviceOrders.id,
      code: serviceOrders.code,
      status: serviceOrders.status,
      receivedAt: serviceOrders.receivedAt,
      deliveredAt: serviceOrders.deliveredAt,
      odometerIn: serviceOrders.odometerIn,
      customerComplaint: serviceOrders.customerComplaint,
      total: serviceOrders.total,
    })
    .from(serviceOrders)
    .where(eq(serviceOrders.vehicleId, vehicleId))
    .orderBy(desc(serviceOrders.receivedAt));
}

export type VehicleInput = {
  customerId?: string | null;
  licensePlate: string;
  vin?: string | null;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  engineNumber?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  odometer?: number | null;
  nextServiceAt?: Date | null;
  nextServiceOdometer?: number | null;
  note?: string | null;
};

export class DuplicatePlateError extends Error {
  constructor(plate: string) {
    super(`Biển số ${plate} đã có hồ sơ xe.`);
    this.name = "DuplicatePlateError";
  }
}

export async function createVehicle(input: VehicleInput) {
  const licensePlate = normalizePlate(input.licensePlate);
  if (await findVehicleByPlate(licensePlate)) throw new DuplicatePlateError(licensePlate);

  const [vehicle] = await db.insert(vehicles).values({ ...input, licensePlate }).returning();
  return vehicle;
}

export async function updateVehicle(id: string, patch: Partial<VehicleInput>) {
  const next = { ...patch };
  if (next.licensePlate) {
    next.licensePlate = normalizePlate(next.licensePlate);
    const existing = await findVehicleByPlate(next.licensePlate);
    if (existing && existing.id !== id) throw new DuplicatePlateError(next.licensePlate);
  }
  const [vehicle] = await db.update(vehicles).set(next).where(eq(vehicles.id, id)).returning();
  return vehicle;
}

export async function deleteVehicle(id: string) {
  await db.delete(vehicles).where(eq(vehicles.id, id));
}

export type VehicleDueForService = {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  odometer: number | null;
  nextServiceAt: Date | null;
  nextServiceOdometer: number | null;
  // Lý do lọt vào danh sách — để email nói được "tới hạn theo ngày" hay "theo số km"
  // thay vì một câu chung chung không giúp khách quyết định gì.
  dueReason: "date" | "odometer" | "both";
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
};

// Xe tới hạn bảo dưỡng — đọc mốc đã tính sẵn trên hồ sơ xe (xem ARCHITECTURE mục 4.2),
// không quét lại toàn bộ lịch sử dịch vụ.
//
// Xe chưa từng đặt mốc nào (cả 2 cột NULL) tự động không lọt vào kết quả: so sánh với
// NULL trong SQL cho NULL, không phải true.
export async function listVehiclesDueForService(options?: {
  withinDays?: number;
  withinKm?: number;
}): Promise<VehicleDueForService[]> {
  const withinDays = options?.withinDays ?? 7;
  const withinKm = options?.withinKm ?? 500;
  const dateLimit = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: vehicles.id,
      licensePlate: vehicles.licensePlate,
      make: vehicles.make,
      model: vehicles.model,
      odometer: vehicles.odometer,
      nextServiceAt: vehicles.nextServiceAt,
      nextServiceOdometer: vehicles.nextServiceOdometer,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
    })
    .from(vehicles)
    .leftJoin(customers, eq(vehicles.customerId, customers.id))
    .where(
      or(
        lte(vehicles.nextServiceAt, dateLimit),
        // Xe chạy nhiều có thể tới hạn theo km trước khi tới hạn theo ngày.
        sql`${vehicles.odometer} + ${withinKm} >= ${vehicles.nextServiceOdometer}`,
      ),
    )
    .orderBy(asc(vehicles.nextServiceAt));

  const dateLimitMs = dateLimit.getTime();

  return rows.map((row) => {
    const dueByDate = row.nextServiceAt !== null && row.nextServiceAt.getTime() <= dateLimitMs;
    const dueByOdometer =
      row.odometer !== null &&
      row.nextServiceOdometer !== null &&
      row.odometer + withinKm >= row.nextServiceOdometer;

    return {
      id: row.id,
      licensePlate: row.licensePlate,
      make: row.make,
      model: row.model,
      odometer: row.odometer,
      nextServiceAt: row.nextServiceAt,
      nextServiceOdometer: row.nextServiceOdometer,
      dueReason: dueByDate && dueByOdometer ? "both" : dueByDate ? "date" : "odometer",
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
    };
  });
}

export const FUEL_TYPES = [
  { value: "gasoline", label: "Xăng" },
  { value: "diesel", label: "Dầu (Diesel)" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Điện" },
] as const;

export const TRANSMISSIONS = [
  { value: "manual", label: "Số sàn" },
  { value: "automatic", label: "Số tự động" },
] as const;
