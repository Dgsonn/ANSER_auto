// "Luồng" giao diện theo chức vụ nhân sự liên kết — xem giải thích đầy đủ ở
// `resolveUserFlow()` trong `src/server/session.ts`. File này là module thuần (không
// "use client") để dùng được từ cả trang đăng nhập (client) lẫn nơi khác cần suy trang
// đích mà không kéo theo code chỉ chạy trên server.
export type UserFlow = "manager" | "accountant" | "technician";

export function flowLandingPath(flow: UserFlow): string {
  switch (flow) {
    case "accountant":
      return "/dashboard/invoices";
    case "technician":
      return "/dashboard/attendance";
    default:
      return "/dashboard";
  }
}
