import { NextResponse } from "next/server";
import { apiError, badRequest, handle, notFound, unauthorized } from "@/server/api";
import {
  activateN8nWorkflow,
  deactivateN8nWorkflow,
  isN8nApiConfigured,
  listN8nWorkflows,
} from "@/server/n8nApi";
import { requireUser } from "@/server/session";
import { getRule, updateRule, WORKFLOW_NAMES } from "@/server/store/automation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const rule = await getRule(id);
    if (!rule) return notFound("Không tìm thấy quy tắc.");

    const patch: Parameters<typeof updateRule>[1] = {};
    if ("thresholdQty" in body) patch.thresholdQty = body.thresholdQty ? Number(body.thresholdQty) : null;
    if ("thresholdDays" in body) patch.thresholdDays = body.thresholdDays ? Number(body.thresholdDays) : null;
    if ("thresholdKm" in body) patch.thresholdKm = body.thresholdKm ? Number(body.thresholdKm) : null;
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();

    if ("enabled" in body) {
      const enabled = Boolean(body.enabled);

      // Bật/tắt phải tác động vào n8n THẬT trước, rồi mới ghi DB. Nếu n8n lỗi mà vẫn ghi
      // DB thì app hiện "đang bật" trong khi workflow nằm im — người dùng tin là đã bật và
      // không bao giờ nhận được cảnh báo.
      if (isN8nApiConfigured()) {
        let workflowId = rule.n8nWorkflowId;
        if (!workflowId) {
          try {
            const workflows = await listN8nWorkflows();
            workflowId =
              workflows.find(
                (w) => w.name === WORKFLOW_NAMES[rule.type as keyof typeof WORKFLOW_NAMES],
              )?.id ?? null;
          } catch {
            workflowId = null;
          }
        }

        if (workflowId) {
          try {
            if (enabled) await activateN8nWorkflow(workflowId);
            else await deactivateN8nWorkflow(workflowId);
            patch.n8nWorkflowId = workflowId;
          } catch (error) {
            return apiError(
              error instanceof Error ? error.message : "Không điều khiển được n8n.",
              502,
            );
          }
        }
      }

      patch.enabled = enabled;
    }

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    return NextResponse.json({ rule: await updateRule(id, patch) });
  });
}
