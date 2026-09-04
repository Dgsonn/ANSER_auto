import { SERVICE_ORDER_STATUS_LABELS, type ServiceOrderStatus } from "@/server/domain";

// n8n tắt/chưa cấu hình không được làm hỏng luồng nghiệp vụ chính (vd tiếp nhận xe,
// đóng lệnh sửa chữa) — mọi lỗi ở đây chỉ log lại, không throw.
//
// Khác `n8nApi.ts`: file đó ĐIỀU KHIỂN n8n và **có** throw, vì route gọi nó cần biết lỗi
// để không cập nhật DB sai trạng thái.
export async function triggerN8nWebhook(path: string, payload: unknown) {
  const base = process.env.N8N_WEBHOOK_URL;
  if (!base) return;

  try {
    await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    console.error(`[n8n] Không gọi được webhook "${path}":`, error);
  }
}

export type OrderStatusNotification = {
  orderCode: string;
  status: ServiceOrderStatus;
  licensePlate: string;
  vehicle?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  branchName?: string | null;
  branchPhone?: string | null;
  promisedAt?: Date | null;
  total?: number | null;
  note?: string | null;
};

// Chỉ báo khách ở các mốc họ thực sự quan tâm. Báo mọi lần đổi trạng thái (kể cả
// received → diagnosing) là cách nhanh nhất để khách đánh dấu email của gara là spam.
//
// "awaiting_acceptance" (chờ nghiệm thu), không phải "completed", là mốc báo khách tới
// nhận xe — "completed" chỉ có nghĩa là xưởng đã làm xong việc kỹ thuật, khách chưa được
// mời tới.
const NOTIFIABLE_STATUSES: ServiceOrderStatus[] = ["quoted", "awaiting_acceptance", "delivered"];

// ĐIỂM TÍCH HỢP: gọi hàm này sau khi cập nhật thành công trạng thái lệnh sửa chữa
// (trong store `serviceOrders` sẽ viết ở bước sau) — gọi SAU khi commit, không gọi trong
// transaction: webhook chậm/lỗi không được giữ transaction mở hay làm rollback việc đã xong.
export async function notifyOrderStatusChanged(payload: OrderStatusNotification) {
  if (!NOTIFIABLE_STATUSES.includes(payload.status)) return;
  if (!payload.customerEmail) return;

  await triggerN8nWebhook("order-status", {
    order_code: payload.orderCode,
    status: payload.status,
    status_label: SERVICE_ORDER_STATUS_LABELS[payload.status],
    license_plate: payload.licensePlate,
    vehicle: payload.vehicle ?? null,
    customer_name: payload.customerName ?? null,
    customer_email: payload.customerEmail,
    customer_phone: payload.customerPhone ?? null,
    branch_name: payload.branchName ?? null,
    branch_phone: payload.branchPhone ?? null,
    promised_at: payload.promisedAt ?? null,
    total: payload.total ?? null,
    note: payload.note ?? null,
  });
}
