import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

// Sinh số chứng từ từ sequence Postgres. `nextval` là nguyên tử: hai request đồng thời
// luôn nhận hai số khác nhau, không cần khoá bảng và không có cửa sổ race như `count(*)+1`.
async function nextval(sequence: string): Promise<number> {
  const rows = await db.execute<{ value: string }>(
    sql`select nextval(${sequence})::text as value`,
  );
  // node-postgres trả bigint dạng chuỗi để không mất chính xác — ở đây số còn rất nhỏ
  // so với giới hạn an toàn của Number nên parse thẳng.
  const raw = (rows.rows ?? rows)[0] as { value: string };
  return Number(raw.value);
}

export async function nextServiceOrderCode(now = new Date()): Promise<string> {
  const n = await nextval("service_order_code_seq");
  return `RO-${now.getFullYear()}-${String(n).padStart(4, "0")}`;
}

export async function nextInvoiceCode(now = new Date()): Promise<string> {
  const n = await nextval("invoice_code_seq");
  return `HD-${now.getFullYear()}-${String(n).padStart(4, "0")}`;
}

// Gợi ý mã kế tiếp cho danh mục người dùng tự đặt mã (phụ tùng, dịch vụ). CHỈ là gợi ý
// điền sẵn vào form — người dùng sửa được, và ràng buộc unique mới là thứ chống trùng thật.
// Không dùng cách này cho chứng từ.
export function suggestNextCode(prefix: string, existingCodes: string[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const max = existingCodes.reduce((acc, code) => {
    const match = pattern.exec(code);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
