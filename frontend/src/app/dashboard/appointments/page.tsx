"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/dashboard/icons";
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
  formatDateTime,
} from "@/components/ui/PageShell";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  arrived: "Khách đã tới",
  no_show: "Khách không tới",
  cancelled: "Đã huỷ",
};

const STATUS_TONES: Record<string, "zinc" | "sky" | "emerald" | "red" | "orange"> = {
  pending: "orange",
  confirmed: "sky",
  arrived: "emerald",
  no_show: "red",
  cancelled: "zinc",
};

const SOURCES: Record<string, string> = {
  phone: "Điện thoại",
  web: "Website",
  walk_in: "Tới trực tiếp",
  reminder: "Từ nhắc bảo dưỡng",
};

type Appointment = {
  id: string;
  branchName: string;
  scheduledAt: string;
  status: string;
  source: string;
  requestNote: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  plate: string | null;
  vehicleLabel: string | null;
};

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string | null }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string; make: string; model: string; customerId: string | null }>>([]);

  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    branchId: "",
    scheduledAt: "",
    customerId: "",
    vehicleId: "",
    contactName: "",
    contactPhone: "",
    plateText: "",
    source: "phone",
    requestNote: "",
  });

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được lịch hẹn.");
      setItems(data.appointments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(statusFilter), 200);
    return () => clearTimeout(timer);
  }, [statusFilter, load]);

  useEffect(() => {
    Promise.all([
      fetch("/api/branches").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/customers").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([b, c, v]) => {
        if (b) setBranches(b.branches);
        if (c) setCustomers(c.customers);
        if (v) setVehicles(v.vehicles);
      })
      .catch(() => {});
  }, []);

  async function changeStatus(id: string, status: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Không đổi được trạng thái.");
      }
      await load(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không tạo được lịch hẹn.");
      setCreating(false);
      await load(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không xoá được.");
      setDeleting(null);
      await load(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  // Chọn khách thì lọc xe của đúng khách đó; chưa chọn thì hiện tất cả (khách mới gọi
  // điện chưa có hồ sơ vẫn phải đặt được lịch).
  const selectableVehicles = form.customerId
    ? vehicles.filter((v) => v.customerId === form.customerId)
    : vehicles;

  return (
    <div>
      <PageHeader
        title="Lịch hẹn"
        subtitle="Khách hẹn mang xe tới xưởng."
        action={
          <PrimaryButton
            onClick={() => {
              setForm({
                branchId: branches[0]?.id ?? "",
                scheduledAt: "",
                customerId: "",
                vehicleId: "",
                contactName: "",
                contactPhone: "",
                plateText: "",
                source: "phone",
                requestNote: "",
              });
              setCreating(true);
            }}
            disabled={branches.length === 0}
          >
            <PlusIcon className="h-4 w-4" /> Đặt lịch hẹn
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 [&>option]:bg-zinc-900"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : items.length === 0 ? (
          <EmptyState title="Chưa có lịch hẹn nào." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Giờ hẹn</th>
                  <th className="px-5 py-3 font-semibold">Khách hàng</th>
                  <th className="px-5 py-3 font-semibold">Xe</th>
                  <th className="px-5 py-3 font-semibold">Yêu cầu</th>
                  <th className="px-5 py-3 font-semibold">Nguồn</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap">{formatDateTime(a.scheduledAt)}</td>
                    <td className="px-5 py-3">
                      <div>{a.contactName ?? "—"}</div>
                      <div className="text-xs text-zinc-500">
                        {a.contactPhone ?? ""}
                        {!a.contactEmail && a.contactPhone && (
                          <span className="ml-1 text-orange-400/70">· chưa có email</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs">{a.plate ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{a.vehicleLabel ?? ""}</div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{a.requestNote ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{SOURCES[a.source] ?? a.source}</td>
                    <td className="px-5 py-3">
                      <select
                        value={a.status}
                        disabled={saving}
                        onChange={(e) => changeStatus(a.id, e.target.value)}
                        className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none disabled:opacity-50 [&>option]:bg-zinc-900"
                      >
                        {Object.entries(STATUS_LABELS).map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1">
                        <Badge tone={STATUS_TONES[a.status] ?? "zinc"}>
                          {STATUS_LABELS[a.status]}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setDeleting(a)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {creating && (
        <Modal
          title="Đặt lịch hẹn"
          onClose={() => setCreating(false)}
          wide
          footer={
            <>
              <GhostButton type="button" onClick={() => setCreating(false)}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="appt-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Đặt lịch"}
              </PrimaryButton>
            </>
          }
        >
          <form id="appt-form" onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Thời gian hẹn"
              type="datetime-local"
              required
              value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
            />
            <SelectField
              label="Chi nhánh"
              required
              value={form.branchId}
              onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Khách hàng đã có hồ sơ"
              value={form.customerId}
              onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value, vehicleId: "" }))}
            >
              <option value="">— Khách mới / chưa có hồ sơ —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Xe"
              value={form.vehicleId}
              onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))}
            >
              <option value="">— Chưa xác định —</option>
              {selectableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} — {v.make} {v.model}
                </option>
              ))}
            </SelectField>

            {!form.customerId && (
              <>
                <TextField
                  label="Tên người liên hệ"
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                />
                <TextField
                  label="Số điện thoại"
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                />
                <TextField
                  label="Biển số (gõ tay)"
                  hint="dùng khi xe chưa có hồ sơ"
                  value={form.plateText}
                  onChange={(e) => setForm((p) => ({ ...p, plateText: e.target.value }))}
                />
              </>
            )}

            <SelectField
              label="Nguồn"
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
            >
              {Object.entries(SOURCES).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </SelectField>

            <div className="sm:col-span-2">
              <TextAreaField
                label="Khách yêu cầu gì"
                value={form.requestNote}
                onChange={(e) => setForm((p) => ({ ...p, requestNote: e.target.value }))}
              />
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xoá lịch hẹn"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setDeleting(null)}>
                Huỷ
              </GhostButton>
              <PrimaryButton onClick={handleDelete} disabled={saving}>
                Xoá
              </PrimaryButton>
            </>
          }
        >
          <p className="text-sm text-zinc-300">
            Xoá lịch hẹn {formatDateTime(deleting.scheduledAt)} của {deleting.contactName ?? "khách"}?
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Nếu khách chỉ đổi ý, nên đổi trạng thái sang &ldquo;Đã huỷ&rdquo; thay vì xoá — giữ
            lại để biết tỉ lệ huỷ hẹn.
          </p>
        </Modal>
      )}
    </div>
  );
}
