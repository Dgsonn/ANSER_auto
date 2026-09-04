// Hàm định dạng thuần — KHÔNG đặt trong file có "use client".
//
// Trước đây chúng nằm trong `components/ui/PageShell.tsx`, vốn là client module; Server
// Component (trang Báo cáo) import vào là lỗi runtime "Attempted to call formatVnd() from
// the server but formatVnd is on the client". Tách ra đây để cả hai phía dùng chung.

export function formatVnd(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}
