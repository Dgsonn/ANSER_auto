import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type Db = NeonDatabase<typeof schema>;

let instance: Db | undefined;

function getDb(): Db {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Add it to frontend/.env.local.");
    }
    // Pool-based (WebSocket) driver — cần cho db.transaction() thật, khác driver
    // neon-http nhẹ hơn nhưng chỉ chạy được từng câu lệnh đơn lẻ. Ở đây transaction là
    // bắt buộc: xuất phụ tùng cho lệnh sửa chữa phải đồng thời trừ tồn kho, ghi dòng
    // giao dịch kho và cập nhật tổng tiền của lệnh — lệch một trong ba là sai sổ.
    instance = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
  }
  return instance;
}

// Khởi tạo LƯỜI qua Proxy, không phải `export const db = drizzle(...)` như ANSER v2.
// Lý do: `next build` import mọi module server để thu thập metadata trang, nên khởi tạo
// ngay lúc import sẽ làm build fail trên máy CI chưa có DATABASE_URL — dù không câu
// truy vấn nào thực sự chạy. Proxy giữ nguyên cách dùng `db.select()...` ở mọi store.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
