import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { employees } from "@/server/db/schema";

export type Employee = typeof employees.$inferSelect;

export async function listEmployees(options?: { branchId?: string; activeOnly?: boolean }) {
  const conditions = [];
  if (options?.branchId) conditions.push(eq(employees.branchId, options.branchId));
  if (options?.activeOnly) conditions.push(eq(employees.active, true));

  return db
    .select()
    .from(employees)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(employees.name));
}

// Kỹ thuật viên = nhân sự có chức vụ "Kỹ thuật viên". Dùng cho dropdown gán người
// thực hiện trên từng dòng công của lệnh sửa chữa.
export async function listTechnicians(branchId?: string) {
  const conditions = [eq(employees.position, "Kỹ thuật viên"), eq(employees.active, true)];
  if (branchId) conditions.push(eq(employees.branchId, branchId));
  return db.select().from(employees).where(and(...conditions)).orderBy(asc(employees.name));
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return rows[0];
}

export async function createEmployee(input: {
  name: string;
  position?: string | null;
  specialty?: string | null;
  hourlyCost?: number | null;
  phone?: string | null;
  email?: string | null;
  hireDate?: Date | null;
  branchId?: string | null;
  note?: string | null;
}) {
  const [employee] = await db.insert(employees).values(input).returning();
  return employee;
}

export async function updateEmployee(
  id: string,
  patch: Partial<{
    name: string;
    position: string | null;
    specialty: string | null;
    hourlyCost: number | null;
    phone: string | null;
    email: string | null;
    hireDate: Date | null;
    branchId: string | null;
    active: boolean;
    note: string | null;
  }>,
) {
  const [employee] = await db.update(employees).set(patch).where(eq(employees.id, id)).returning();
  return employee;
}

export async function deleteEmployee(id: string) {
  await db.delete(employees).where(eq(employees.id, id));
}
