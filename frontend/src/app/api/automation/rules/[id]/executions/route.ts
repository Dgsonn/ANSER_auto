import { NextResponse } from "next/server";
import { badRequest, handle, notFound, unauthorized } from "@/server/api";
import { isN8nApiConfigured, listN8nExecutions } from "@/server/n8nApi";
import { requireUser } from "@/server/session";
import { getRule } from "@/server/store/automation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Lịch sử chạy THẬT từ n8n. Trả lý do cụ thể khi không lấy được, thay vì một danh sách
// rỗng — rỗng trông giống "chưa chạy lần nào", che mất việc chưa cấu hình API key.
export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;

    const rule = await getRule(id);
    if (!rule) return notFound("Không tìm thấy quy tắc.");

    if (!isN8nApiConfigured()) {
      return badRequest(
        "Chưa cấu hình N8N_API_URL/N8N_API_KEY — tạo API key trong n8n UI (Settings → n8n API) rồi dán vào .env.local.",
      );
    }
    if (!rule.n8nWorkflowId) {
      return badRequest(
        "Quy tắc này chưa liên kết workflow nào trong n8n. Import file JSON tương ứng vào n8n rồi bật quy tắc để tự liên kết.",
      );
    }

    return NextResponse.json({ executions: await listN8nExecutions(rule.n8nWorkflowId, 10) });
  });
}
