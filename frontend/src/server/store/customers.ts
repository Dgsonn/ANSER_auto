import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { customers, invoices, serviceOrders, vehicles } from "@/server/db/schema";

export type Customer = typeof customers.$inferSelect;

export type CustomerListItem = Customer & {
  vehicleCount: number;
  orderCount: number;
  totalSpent: number;
  lastVisitAt: Date | null;
};

// Số xe / số lần vào xưởng / tổng chi tiêu tính bằng subquery tương quan thay vì JOIN +
// GROUP BY: join cả 3 bảng con rồi group sẽ nhân chéo số dòng (1 khách 2 xe 3 lệnh ra 6
// dòng), làm COUNT và SUM đều sai — loại lỗi mà mắt thường nhìn kết quả vẫn thấy hợp lý.
export async function listCustomers(search?: string): Promise<CustomerListItem[]> {
  const term = search?.trim();
  const where = term
    ? or(
        ilike(customers.name, `%${term}%`),
        ilike(customers.phone, `%${term}%`),
        ilike(customers.email, `%${term}%`),
      )
    : undefined;

  return db
    .select({
      id: customers.id,
      name: customers.name,
      type: customers.type,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      taxCode: customers.taxCode,
      note: customers.note,
      createdAt: customers.createdAt,
      vehicleCount: sql<number>`(
        select count(*)::int from ${vehicles} where ${vehicles.customerId} = ${customers.id}
      )`,
      orderCount: sql<number>`(
        select count(*)::int from ${serviceOrders} where ${serviceOrders.customerId} = ${customers.id}
      )`,
      totalSpent: sql<number>`(
        select coalesce(sum(${invoices.total}), 0)::int
        from ${invoices} where ${invoices.customerId} = ${customers.id}
      )`,
      lastVisitAt: sql<Date | null>`(
        select max(${serviceOrders.receivedAt})
        from ${serviceOrders} where ${serviceOrders.customerId} = ${customers.id}
      )`,
    })
    .from(customers)
    .where(where)
    .orderBy(asc(customers.name));
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0];
}

export type CustomerInput = {
  name: string;
  type?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  note?: string | null;
};

export async function createCustomer(input: CustomerInput) {
  const [customer] = await db
    .insert(customers)
    .values({ ...input, type: input.type ?? "individual" })
    .returning();
  return customer;
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput>) {
  const [customer] = await db
    .update(customers)
    .set(patch)
    .where(eq(customers.id, id))
    .returning();
  return customer;
}

// Xoá khách KHÔNG xoá xe hay lịch sử sửa chữa: `vehicles.customerId` và
// `service_orders.customerId` đều `set null`. Lịch sử dịch vụ thuộc về chiếc xe, không
// thuộc về người từng đứng tên nó.
export async function deleteCustomer(id: string) {
  await db.delete(customers).where(eq(customers.id, id));
}

// Xe của một khách — dùng ở trang Khách hàng (mở rộng dòng) và khi lập lệnh sửa chữa.
export async function listCustomerVehicles(customerId: string) {
  return db
    .select()
    .from(vehicles)
    .where(eq(vehicles.customerId, customerId))
    .orderBy(desc(vehicles.createdAt));
}

export function customerTypeLabel(type: string) {
  return type === "company" ? "Doanh nghiệp" : "Cá nhân";
}
