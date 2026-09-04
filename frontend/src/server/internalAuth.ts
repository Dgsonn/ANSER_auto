import { apiError } from "@/server/api";

export const INTERNAL_TOKEN_HEADER = "x-internal-token";

// Các endpoint `/api/n8n/internal/*` được n8n gọi server-to-server nên không có cookie
// đăng nhập. ANSER v2 để chúng mở hoàn toàn; ở đây thì không được, vì dữ liệu trả về
// gồm tên/SĐT/email khách hàng — bất kỳ ai chạm được tới server đều đọc sạch.
//
// Quy tắc:
//   - Có `N8N_INTERNAL_TOKEN` → bắt buộc khớp header `X-Internal-Token`.
//   - Không có, ở development → cho qua (import workflow là chạy được ngay trên máy).
//   - Không có, ở production → CHẶN. Thiếu cấu hình phải nổ ra, không được âm thầm
//     biến thành endpoint công khai.
//
// Trả `null` nghĩa là hợp lệ; trả NextResponse nghĩa là chặn.
export function checkInternalToken(request: Request) {
  const expected = process.env.N8N_INTERNAL_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return apiError(
        "Chưa cấu hình N8N_INTERNAL_TOKEN — endpoint nội bộ bị khoá ở production.",
        503,
      );
    }
    return null;
  }

  const provided = request.headers.get(INTERNAL_TOKEN_HEADER);
  if (provided !== expected) {
    return apiError("Token nội bộ không hợp lệ.", 401);
  }
  return null;
}
