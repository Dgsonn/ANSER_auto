import { NextResponse } from "next/server";
import { handle, unauthorized } from "@/server/api";
import { isN8nApiConfigured, listN8nWorkflows } from "@/server/n8nApi";
import { requireUser } from "@/server/session";
import { listRules, WORKFLOW_NAMES } from "@/server/store/automation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();

    const rules = await listRules();
    const configured = isN8nApiConfigured();

    // Trạng thái THẬT của workflow lấy từ n8n, không chỉ đọc cờ `enabled` trong DB của
    // app: hai nơi lệch nhau là chuyện thường (ai đó tắt workflow thẳng trong n8n UI), và
    // hiển thị cờ của app như thể là sự thật sẽ khiến người dùng tin nhầm.
    let workflows: Array<{ id: string; name: string; active: boolean }> = [];
    let n8nError: string | null = null;
    if (configured) {
      try {
        workflows = await listN8nWorkflows();
      } catch (error) {
        n8nError = error instanceof Error ? error.message : "Không gọi được n8n.";
      }
    }

    return NextResponse.json({
      rules: rules.map((rule) => {
        const linked = rule.n8nWorkflowId
          ? workflows.find((w) => w.id === rule.n8nWorkflowId)
          : undefined;
        // Chưa liên kết thì dò theo tên — người dùng chỉ cần import file JSON vào n8n,
        // không phải copy ID thủ công.
        const byName = workflows.find(
          (w) => w.name === WORKFLOW_NAMES[rule.type as keyof typeof WORKFLOW_NAMES],
        );
        return {
          ...rule,
          expectedWorkflowName: WORKFLOW_NAMES[rule.type as keyof typeof WORKFLOW_NAMES] ?? null,
          matchedWorkflowId: linked?.id ?? byName?.id ?? null,
          n8nActive: linked?.active ?? byName?.active ?? null,
        };
      }),
      n8nConfigured: configured,
      n8nError,
    });
  });
}
