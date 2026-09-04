import { NextResponse } from "next/server";

// Helper dùng chung cho mọi Route Handler, để lỗi trả về có 1 định dạng duy nhất
// (`{ message }`) — ANSER v2 để mỗi route tự viết `NextResponse.json({message}, {status})`
// và không có wrapper bắt lỗi runtime, nên lỗi ngoài dự kiến rơi về HTML 500 mặc định
// của Next, phía client parse JSON là nổ tiếp một lỗi thứ hai che mất lỗi gốc.

export function apiError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export const badRequest = (message = "Dữ liệu không hợp lệ.") => apiError(message, 400);
export const unauthorized = (message = "Bạn cần đăng nhập.") => apiError(message, 401);
export const forbidden = (message = "Bạn không có quyền thực hiện thao tác này.") => apiError(message, 403);
export const notFound = (message = "Không tìm thấy dữ liệu.") => apiError(message, 404);
export const conflict = (message: string) => apiError(message, 409);

// Bọc thân Route Handler: lỗi không lường trước vẫn trả JSON đúng định dạng thay vì
// trang lỗi HTML.
export async function handle<T>(fn: () => Promise<NextResponse<T> | NextResponse>) {
  try {
    return await fn();
  } catch (error) {
    console.error("[api]", error);
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    return apiError(message, 500);
  }
}
