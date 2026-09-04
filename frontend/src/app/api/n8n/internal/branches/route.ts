import { NextResponse } from "next/server";
import { handle } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { listBranches } from "@/server/store/branches";
import { getCompanySettings } from "@/server/store/settings";

export const dynamic = "force-dynamic";

// Workflow "Cảnh báo phụ tùng sắp hết" gọi endpoint này trước để biết có những chi nhánh
// nào và email nhận cảnh báo của từng chi nhánh, rồi mới lặp qua từng chi nhánh.
//
// Key trả về dùng snake_case: phía tiêu thụ là biểu thức trong n8n, không phải code
// TypeScript của app — giữ nguyên quy ước của n8n dễ đọc hơn khi sửa trong UI kéo-thả.
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const [branches, company] = await Promise.all([listBranches(), getCompanySettings()]);
    const fallbackEmail = company.email ?? process.env.N8N_NOTIFY_EMAIL ?? null;

    return NextResponse.json({
      company_name: company.name,
      // Email dùng cho báo cáo toàn doanh nghiệp (không thuộc chi nhánh nào).
      company_email: fallbackEmail,
      branches: branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        phone: branch.phone,
        // Chi nhánh chưa đặt email riêng thì rơi về email doanh nghiệp — không thì
        // cảnh báo im lặng biến mất, đúng loại lỗi không ai phát hiện.
        notification_email: branch.notificationEmail ?? fallbackEmail,
      })),
    });
  });
}
