"use client";

import { useCallback, useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  GhostButton,
  PageHeader,
  formatDateTime,
} from "@/components/ui/PageShell";

const TYPE_LABELS: Record<string, string> = {
  low_stock_alert: "Cảnh báo phụ tùng sắp hết",
  maintenance_reminder: "Nhắc bảo dưỡng định kỳ",
  appointment_reminder: "Nhắc lịch hẹn",
  order_status_update: "Báo tiến độ sửa chữa",
  awaiting_acceptance_reminder: "Nhắc chờ nghiệm thu quá hạn",
  unpaid_invoice_report: "Báo cáo công nợ",
  revenue_report: "Báo cáo doanh thu định kỳ",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  low_stock_alert: "Mỗi 6 giờ, gửi email cho từng chi nhánh danh sách phụ tùng đã chạm ngưỡng.",
  maintenance_reminder: "8h mỗi ngày, nhắc khách có xe tới hạn và gửi bản tổng hợp cho gara.",
  appointment_reminder: "17h mỗi ngày, nhắc khách có lịch hẹn trong 24 giờ tới.",
  order_status_update: "Gửi ngay khi lệnh chuyển sang Đã báo giá / Chờ nghiệm thu / Đã giao xe.",
  awaiting_acceptance_reminder:
    "9h mỗi ngày, nhắc khách có xe chờ nghiệm thu quá hạn và gửi bản tổng hợp cho gara.",
  unpaid_invoice_report:
    "9h mỗi ngày, gửi quản lý danh sách hoá đơn chưa thu đủ quá hạn — không gửi khách.",
  revenue_report: "20h mỗi ngày, gửi báo cáo doanh thu về email doanh nghiệp.",
};

// Tên file JSON trong public/n8n-templates/ — sinh tự động từ n8n-workflows/ (xem
// scripts/sync-n8n-templates.mjs), khớp 1-1 với AutomationRuleType.
const TEMPLATE_FILES: Record<string, string> = {
  low_stock_alert: "low_stock_alert.json",
  maintenance_reminder: "maintenance_reminder.json",
  appointment_reminder: "appointment_reminder.json",
  order_status_update: "order_status_update.json",
  awaiting_acceptance_reminder: "awaiting_acceptance_reminder.json",
  unpaid_invoice_report: "unpaid_invoice_report.json",
  revenue_report: "revenue_report.json",
};

type Rule = {
  id: string;
  name: string;
  type: string;
  branchName: string | null;
  thresholdQty: number | null;
  thresholdDays: number | null;
  thresholdKm: number | null;
  enabled: boolean;
  n8nWorkflowId: string | null;
  expectedWorkflowName: string | null;
  matchedWorkflowId: string | null;
  n8nActive: boolean | null;
};

type Execution = {
  id: string | number;
  status: string;
  startedAt?: string;
  stoppedAt?: string | null;
};

export default function AutomationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [n8nConfigured, setN8nConfigured] = useState(false);
  const [n8nError, setN8nError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Rule | null>(null);
  const [thresholds, setThresholds] = useState({ qty: "", days: "", km: "" });

  const [history, setHistory] = useState<{ rule: Rule; rows: Execution[] } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [template, setTemplate] = useState<{ rule: Rule; file: string; content: string } | null>(
    null,
  );
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/automation/rules");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được quy tắc.");
      setRules(data.rules);
      setN8nConfigured(data.n8nConfigured);
      setN8nError(data.n8nError);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/automation/rules")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          setRules(data.rules);
          setN8nConfigured(data.n8nConfigured);
          setN8nError(data.n8nError);
        } else setError(data?.message ?? "Không tải được quy tắc.");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được quy tắc.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(rule: Rule) {
    setBusy(true);
    try {
      const res = await fetch(`/api/automation/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không đổi được trạng thái.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setBusy(false);
    }
  }

  async function saveThresholds() {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/automation/rules/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thresholdQty: thresholds.qty || null,
          thresholdDays: thresholds.days || null,
          thresholdKm: thresholds.km || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Không lưu được.");
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setBusy(false);
    }
  }

  async function openHistory(rule: Rule) {
    setHistoryError(null);
    const res = await fetch(`/api/automation/rules/${rule.id}/executions`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setHistory({ rule, rows: [] });
      setHistoryError(data?.message ?? "Không lấy được lịch sử.");
      return;
    }
    setHistory({ rule, rows: data.executions });
  }

  async function openTemplate(rule: Rule) {
    const file = TEMPLATE_FILES[rule.type];
    if (!file) return;
    setCopied(false);
    setTemplateError(null);
    setTemplateLoading(true);
    setTemplate({ rule, file, content: "" });
    try {
      // File tĩnh sinh sẵn ở public/n8n-templates/ (xem scripts/sync-n8n-templates.mjs) —
      // không phải API route, nên không cần đăng nhập lại và luôn khớp file thật trong repo.
      const res = await fetch(`/n8n-templates/${file}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không tìm thấy file mẫu.");
      const text = await res.text();
      setTemplate({ rule, file, content: text });
    } catch (err) {
      setTemplateError(
        err instanceof Error
          ? `${err.message} Chạy "npm run sync:n8n-templates" rồi thử lại.`
          : "Không tải được file mẫu.",
      );
    } finally {
      setTemplateLoading(false);
    }
  }

  async function copyTemplate() {
    if (!template?.content) return;
    try {
      await navigator.clipboard.writeText(template.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setTemplateError("Trình duyệt chặn sao chép — hãy dùng nút Tải xuống thay thế.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Tự động hoá"
        subtitle="Các quy tắc chạy qua n8n. Bật/tắt ở đây điều khiển workflow thật trong n8n."
      />

      <ErrorBanner message={error} />

      {!n8nConfigured && (
        <div className="mb-4 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
          <b>Chưa kết nối n8n.</b> Các công tắc dưới đây hiện chỉ đổi cờ trong cơ sở dữ liệu
          của app, <b>không</b> thực sự bật/tắt workflow nào. Để điều khiển thật: chạy{" "}
          <code className="rounded bg-black/40 px-1">docker compose up -d</code>, tạo API key
          trong n8n UI (Settings → n8n API) rồi dán vào <code className="rounded bg-black/40 px-1">N8N_API_KEY</code>.
        </div>
      )}

      {n8nError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Đã cấu hình n8n nhưng không gọi được: {n8nError}
        </div>
      )}

      {loading ? (
        <EmptyState title="Đang tải..." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rules.map((rule) => {
            const linked = Boolean(rule.matchedWorkflowId);
            return (
              <Card key={rule.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{rule.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {TYPE_DESCRIPTIONS[rule.type] ?? TYPE_LABELS[rule.type] ?? rule.type}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(rule)}
                    disabled={busy}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      rule.enabled ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                    aria-label={rule.enabled ? "Tắt" : "Bật"}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        rule.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {rule.thresholdQty !== null && (
                    <Badge tone="zinc">Ngưỡng tồn: {rule.thresholdQty}</Badge>
                  )}
                  {rule.thresholdDays !== null && (
                    <Badge tone="zinc">Trước {rule.thresholdDays} ngày</Badge>
                  )}
                  {rule.thresholdKm !== null && (
                    <Badge tone="zinc">Trước {rule.thresholdKm} km</Badge>
                  )}
                  {rule.branchName && <Badge tone="violet">{rule.branchName}</Badge>}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
                  {!n8nConfigured ? (
                    <Badge tone="orange">Chưa kết nối n8n</Badge>
                  ) : linked ? (
                    <Badge tone={rule.n8nActive ? "emerald" : "zinc"}>
                      n8n: {rule.n8nActive ? "đang chạy" : "đang dừng"}
                    </Badge>
                  ) : (
                    <Badge tone="red">Chưa import workflow</Badge>
                  )}

                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(rule);
                        setThresholds({
                          qty: rule.thresholdQty?.toString() ?? "",
                          days: rule.thresholdDays?.toString() ?? "",
                          km: rule.thresholdKm?.toString() ?? "",
                        });
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    >
                      Ngưỡng
                    </button>
                    <button
                      onClick={() => openHistory(rule)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    >
                      Lịch sử chạy
                    </button>
                    <button
                      onClick={() => openTemplate(rule)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    >
                      Xem mẫu n8n
                    </button>
                  </div>
                </div>

                {!linked && rule.expectedWorkflowName && (
                  <p className="mt-2 text-[11px] text-zinc-600">
                    Chưa import workflow &ldquo;{rule.expectedWorkflowName}&rdquo; vào n8n — bấm
                    &ldquo;Xem mẫu n8n&rdquo; ở trên để xem/tải file JSON rồi import (n8n UI →
                    Workflows → Import from File).
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={`Ngưỡng — ${editing.name}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setEditing(null)}>
                Huỷ
              </GhostButton>
              <GhostButton onClick={saveThresholds} disabled={busy}>
                Lưu
              </GhostButton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {editing.type === "low_stock_alert" && (
              <TextField
                label="Ngưỡng tồn kho chung"
                type="number"
                hint="phụ tùng có ngưỡng riêng sẽ dùng ngưỡng riêng"
                value={thresholds.qty}
                onChange={(e) => setThresholds((p) => ({ ...p, qty: e.target.value }))}
              />
            )}
            {(editing.type === "maintenance_reminder" || editing.type === "appointment_reminder") && (
              <TextField
                label="Báo trước (ngày)"
                type="number"
                value={thresholds.days}
                onChange={(e) => setThresholds((p) => ({ ...p, days: e.target.value }))}
              />
            )}
            {(editing.type === "awaiting_acceptance_reminder" ||
              editing.type === "unpaid_invoice_report") && (
              <TextField
                label="Quá hạn (ngày)"
                type="number"
                hint={
                  editing.type === "awaiting_acceptance_reminder"
                    ? "chờ nghiệm thu quá số ngày này thì nhắc lại"
                    : "hoá đơn phát hành quá số ngày này mà chưa thu đủ thì báo"
                }
                value={thresholds.days}
                onChange={(e) => setThresholds((p) => ({ ...p, days: e.target.value }))}
              />
            )}
            {editing.type === "maintenance_reminder" && (
              <TextField
                label="Báo trước (km)"
                type="number"
                value={thresholds.km}
                onChange={(e) => setThresholds((p) => ({ ...p, km: e.target.value }))}
              />
            )}

            <p className="rounded-xl bg-orange-500/10 px-4 py-3 text-xs text-orange-200">
              <b>Lưu ý:</b> ngưỡng lưu ở đây chưa được workflow n8n đọc — các workflow hiện
              truyền tham số cứng trong URL (vd <code>?days=7&amp;km=500</code>). Sửa ở đây
              đổi số liệu trang Tổng quan, nhưng muốn đổi hành vi email tự động thì phải sửa
              URL trong node HTTP Request của workflow tương ứng.
            </p>
          </div>
        </Modal>
      )}

      {template && (
        <Modal
          title={`Mẫu n8n — ${template.rule.name}`}
          onClose={() => setTemplate(null)}
          wide
          footer={
            <>
              <GhostButton type="button" onClick={() => setTemplate(null)}>
                Đóng
              </GhostButton>
              <GhostButton type="button" onClick={copyTemplate} disabled={!template.content}>
                {copied ? "Đã sao chép ✓" : "Sao chép"}
              </GhostButton>
              <a
                href={`/n8n-templates/${template.file}`}
                download={template.file}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
              >
                Tải xuống (.json)
              </a>
            </>
          }
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Import vào n8n: <b>Workflows → Import from File</b>. Sau đó gán credential SMTP
              cho node Gửi Email, thay token nội bộ trong các node HTTP Request, rồi bật{" "}
              <b>Active</b>. Chi tiết ở{" "}
              <code className="rounded bg-black/40 px-1">n8n-workflows/README.md</code>.
            </p>
            <Badge tone="zinc">{template.file}</Badge>
          </div>
          {templateLoading ? (
            <EmptyState title="Đang tải..." />
          ) : templateError ? (
            <ErrorBanner message={templateError} />
          ) : (
            <pre className="max-h-[50vh] overflow-auto rounded-xl bg-black/30 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
              {template.content}
            </pre>
          )}
        </Modal>
      )}

      {history && (
        <Modal
          title={`Lịch sử chạy — ${history.rule.name}`}
          onClose={() => setHistory(null)}
          wide
        >
          {historyError ? (
            <p className="rounded-xl bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
              {historyError}
            </p>
          ) : history.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Workflow chưa chạy lần nào.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Bắt đầu</th>
                  <th className="py-2 pr-4 font-semibold">Kết thúc</th>
                  <th className="py-2 font-semibold">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((e) => (
                  <tr key={String(e.id)} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-2 pr-4 text-zinc-400">{formatDateTime(e.startedAt)}</td>
                    <td className="py-2 pr-4 text-zinc-400">{formatDateTime(e.stoppedAt)}</td>
                    <td className="py-2">
                      <Badge tone={e.status === "success" ? "emerald" : e.status === "running" ? "sky" : "red"}>
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  );
}
