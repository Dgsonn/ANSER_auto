"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  GhostButton,
  PageHeader,
  PrimaryButton,
  TableWrap,
} from "@/components/ui/PageShell";

const LABOR_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ làm",
  in_progress: "Đang làm",
  done: "Xong",
};

const STATUS_TONE: Record<string, "zinc" | "sky" | "emerald"> = {
  pending: "zinc",
  in_progress: "sky",
  done: "emerald",
};

type Job = {
  laborId: string;
  serviceOrderId: string;
  orderCode: string;
  orderStatus: string;
  plateSnapshot: string;
  vehicleLabel: string;
  branchName: string | null;
  name: string;
  status: string;
  standardMinutes: number | null;
  actualMinutes: number | null;
  note: string | null;
};

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState({ status: "pending", actualMinutes: "", note: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/technician/jobs");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.message ?? "Không tải được danh sách việc.");
      setLoading(false);
      return;
    }
    setJobs(data.jobs);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/technician/jobs")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) setJobs(data.jobs);
        else setError(data?.message ?? "Không tải được danh sách việc.");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được danh sách việc.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openEdit(job: Job) {
    setForm({
      status: job.status,
      actualMinutes: job.actualMinutes?.toString() ?? "",
      note: job.note ?? "",
    });
    setEditing(job);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/service-orders/${editing.serviceOrderId}/labors/${editing.laborId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: form.status,
            actualMinutes: form.actualMinutes || null,
            note: form.note,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không lưu được.");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Khu vực nhận việc"
        subtitle="Các dòng công đã được giao cho bạn, trên mọi lệnh sửa chữa đang mở."
      />

      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : jobs.length === 0 ? (
          <EmptyState title="Chưa có việc nào được giao." hint="Quản đốc/cố vấn dịch vụ sẽ giao việc trên từng lệnh sửa chữa." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Lệnh / Xe</th>
                  <th className="px-5 py-3 font-semibold">Công việc</th>
                  <th className="px-5 py-3 font-semibold">Xưởng</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-semibold">Giờ công</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.laborId} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs font-semibold">{job.orderCode}</div>
                      <div className="text-xs text-zinc-500">
                        {job.plateSnapshot} · {job.vehicleLabel}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>{job.name}</div>
                      {job.note && <div className="mt-0.5 text-xs text-zinc-500">{job.note}</div>}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{job.branchName ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[job.status] ?? "zinc"}>
                        {LABOR_STATUS_LABELS[job.status] ?? job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-400">
                      {job.actualMinutes ?? "—"}
                      {job.standardMinutes ? ` / ${job.standardMinutes}` : ""} phút
                    </td>
                    <td className="px-5 py-3 text-right">
                      <GhostButton onClick={() => openEdit(job)}>Cập nhật</GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {editing && (
        <Modal
          title={`Cập nhật — ${editing.name}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setEditing(null)}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="job-update-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </PrimaryButton>
            </>
          }
        >
          <form id="job-update-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <SelectField
              label="Trạng thái"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              {Object.entries(LABOR_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Thời gian làm thật (phút)"
              type="number"
              hint={editing.standardMinutes ? `định mức: ${editing.standardMinutes} phút` : undefined}
              value={form.actualMinutes}
              onChange={(e) => setForm((p) => ({ ...p, actualMinutes: e.target.value }))}
            />
            <TextAreaField
              label="Ghi chú"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
