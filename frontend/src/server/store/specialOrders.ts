import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { serviceOrderParts, serviceOrderSpecialOrders, serviceOrders } from "@/server/db/schema";

// Phụ tùng ĐẶT NGOÀI cho một lệnh cụ thể — khác `parts.ts`/`serviceOrders.addPart()`
// (xuất từ tồn kho có sẵn, trừ kho ngay lập tức). Đặt ngoài là phụ tùng gara không có sẵn,
// phải mua riêng cho đúng lệnh này, và có một khoảng "đang chờ hàng" thật sự tồn tại
// trong nghiệp vụ — xem chú thích bảng `service_order_special_orders` trong schema.ts.

export type SpecialOrder = typeof serviceOrderSpecialOrders.$inferSelect;

export class SpecialOrderStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecialOrderStateError";
  }
}

export async function listSpecialOrders(serviceOrderId: string) {
  return db
    .select()
    .from(serviceOrderSpecialOrders)
    .where(eq(serviceOrderSpecialOrders.serviceOrderId, serviceOrderId))
    .orderBy(desc(serviceOrderSpecialOrders.orderedAt));
}

export async function createSpecialOrder(input: {
  serviceOrderId: string;
  name: string;
  supplier?: string | null;
  unit?: string;
  quantity: number;
  estimatedCost?: number | null;
  note?: string | null;
}) {
  const [row] = await db
    .insert(serviceOrderSpecialOrders)
    .values({
      serviceOrderId: input.serviceOrderId,
      name: input.name,
      supplier: input.supplier ?? null,
      unit: input.unit ?? "Cái",
      quantity: input.quantity,
      estimatedCost: input.estimatedCost ?? null,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

async function getOwn(id: string): Promise<SpecialOrder> {
  const [row] = await db
    .select()
    .from(serviceOrderSpecialOrders)
    .where(eq(serviceOrderSpecialOrders.id, id))
    .limit(1);
  if (!row) throw new Error("Không tìm thấy khoản đặt hàng ngoài.");
  return row;
}

// Hàng về — ghi giá thật. Chỉ hợp lệ từ "ordered".
export async function markArrived(id: string, input: { actualCost?: number | null }) {
  const row = await getOwn(id);
  if (row.status !== "ordered") {
    throw new SpecialOrderStateError('Chỉ đánh dấu "đã về" được khi đang ở trạng thái "đang chờ hàng".');
  }
  const [updated] = await db
    .update(serviceOrderSpecialOrders)
    .set({ status: "arrived", actualCost: input.actualCost ?? row.estimatedCost ?? null, arrivedAt: new Date() })
    .where(eq(serviceOrderSpecialOrders.id, id))
    .returning();
  return updated;
}

export async function cancelSpecialOrder(id: string) {
  const row = await getOwn(id);
  if (row.status === "billed") {
    throw new SpecialOrderStateError("Khoản này đã tính vào hoá đơn nên không huỷ được nữa.");
  }
  const [updated] = await db
    .update(serviceOrderSpecialOrders)
    .set({ status: "cancelled" })
    .where(eq(serviceOrderSpecialOrders.id, id))
    .returning();
  return updated;
}

// Chuyển khoản đặt ngoài đã về hàng thành 1 dòng phụ tùng thật trên lệnh — CHỈ lúc này nó
// mới tính vào tổng tiền lệnh. Không trừ tồn kho (hàng này không thuộc kho gara) — khác
// hẳn `serviceOrders.addPart()`. Đây là lý do bảng này tách riêng khỏi `serviceOrderParts`
// thay vì tái dùng `partId = null`: quá trình "đang chờ hàng, chưa tính tiền" cần trạng
// thái riêng mà `serviceOrderParts` (vốn giả định đã có hàng và đã chốt giá) không có.
export async function billSpecialOrder(id: string, input: { sellPrice: number }) {
  const row = await getOwn(id);
  if (row.status !== "arrived") {
    throw new SpecialOrderStateError('Chỉ tính vào hoá đơn được khi hàng đã "về" — đánh dấu đã về trước.');
  }

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: serviceOrders.status })
      .from(serviceOrders)
      .where(eq(serviceOrders.id, row.serviceOrderId))
      .limit(1);
    if (!order) throw new Error("Không tìm thấy lệnh sửa chữa.");
    if (order.status === "delivered" || order.status === "cancelled") {
      throw new SpecialOrderStateError("Lệnh đã chốt nên không thêm được dòng phụ tùng mới.");
    }

    const lineTotal = input.sellPrice * row.quantity;
    const [line] = await tx
      .insert(serviceOrderParts)
      .values({
        serviceOrderId: row.serviceOrderId,
        partId: null, // hàng đặt ngoài, không thuộc danh mục kho
        name: row.name,
        unit: row.unit,
        unitPrice: input.sellPrice,
        unitCost: row.actualCost,
        quantity: row.quantity,
        lineTotal,
      })
      .returning();

    await tx
      .update(serviceOrderSpecialOrders)
      .set({ status: "billed", sellPrice: input.sellPrice, billedLineId: line.id })
      .where(eq(serviceOrderSpecialOrders.id, id));

    // Tính lại tổng lệnh — cùng logic recalcTotals() trong serviceOrders.ts, viết lại tại
    // đây vì hàm gốc không export (private theo thiết kế: mọi đường ghi phải đi qua store
    // của chính nó để không ai quên gọi). Import chéo 2 store cho một câu SUM là thừa.
    const [totalsRow] = await tx
      .select({
        laborTotal: serviceOrders.laborTotal,
        discount: serviceOrders.discount,
      })
      .from(serviceOrders)
      .where(eq(serviceOrders.id, row.serviceOrderId))
      .limit(1);

    const [partSum] = await tx
      .select({ total: sql<number>`coalesce(sum(${serviceOrderParts.lineTotal}), 0)::int` })
      .from(serviceOrderParts)
      .where(eq(serviceOrderParts.serviceOrderId, row.serviceOrderId));

    const partsTotal = partSum?.total ?? 0;
    const laborTotal = totalsRow?.laborTotal ?? 0;
    const discount = totalsRow?.discount ?? 0;

    await tx
      .update(serviceOrders)
      .set({
        partsTotal,
        total: Math.max(0, laborTotal + partsTotal - discount),
        updatedAt: new Date(),
      })
      .where(eq(serviceOrders.id, row.serviceOrderId));

    return line;
  });
}
