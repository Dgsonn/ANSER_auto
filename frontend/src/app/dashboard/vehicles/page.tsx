"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ClockIcon, EditIcon, PlusIcon, TrashIcon } from "@/components/dashboard/icons";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import {
  Badge,
  Card,
  DangerButton,
  EmptyState,
  ErrorBanner,
  GhostButton,
  PageHeader,
  PrimaryButton,
  TableWrap,
  formatDate,
  formatVnd,
} from "@/components/ui/PageShell";

type Vehicle = {
  id: string;
  customerId: string | null;
  licensePlate: string;
  vin: string | null;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  engineNumber: string | null;
  fuelType: string | null;
  transmission: string | null;
  odometer: number | null;
  nextServiceAt: string | null;
  nextServiceOdometer: number | null;
  note: string | null;
  customerName: string | null;
  customerPhone: string | null;
  orderCount: number;
  lastVisitAt: string | null;
};

type HistoryRow = {
  id: string;
  code: string;
  status: string;
  receivedAt: string;
  odometerIn: number | null;
  customerComplaint: string | null;
  total: number;
};

const FUEL_LABELS: Record<string, string> = {
  gasoline: "Xăng",
  diesel: "Dầu",
  hybrid: "Hybrid",
  electric: "Điện",
};

const EMPTY_FORM = {
  licensePlate: "",
  make: "",
  model: "",
  year: "",
  customerId: "",
  vin: "",
  color: "",
  engineNumber: "",
  fuelType: "",
  transmission: "",
  odometer: "",
  note: "",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string | null }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<{ vehicle: Vehicle; rows: HistoryRow[] } | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được danh sách.");
      setVehicles(data.vehicles);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCustomers(d.customers))
      .catch(() => {});
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  function openEdit(v: Vehicle) {
    setForm({
      licensePlate: v.licensePlate,
      make: v.make,
      model: v.model,
      year: v.year?.toString() ?? "",
      customerId: v.customerId ?? "",
      vin: v.vin ?? "",
      color: v.color ?? "",
      engineNumber: v.engineNumber ?? "",
      fuelType: v.fuelType ?? "",
      transmission: v.transmission ?? "",
      odometer: v.odometer?.toString() ?? "",
      note: v.note ?? "",
    });
    setEditing(v);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
    setSaving(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/vehicles/${editing.id}` : "/api/vehicles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không lưu được.");
      closeModal();
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Không xoá được.");
      }
      setDeleting(null);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(v: Vehicle) {
    const res = await fetch(`/api/vehicles/${v.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setHistory({ vehicle: v, rows: data.history });
  }

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Hồ sơ xe"
        subtitle="Lịch sử dịch vụ đi theo xe, không theo chủ xe — sang tên đổi chủ vẫn tra cứu đầy đủ."
        action={
          <PrimaryButton onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> Thêm xe
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo biển số, hãng, dòng xe, số VIN hoặc tên chủ xe..."
          className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
        />
      </div>

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : vehicles.length === 0 ? (
          <EmptyState
            title={search ? "Không tìm thấy xe nào." : "Chưa có hồ sơ xe nào."}
            hint={search ? undefined : 'Bấm "Thêm xe" để tạo hồ sơ đầu tiên.'}
          />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Biển số</th>
                  <th className="px-5 py-3 font-semibold">Xe</th>
                  <th className="px-5 py-3 font-semibold">Chủ xe</th>
                  <th className="px-5 py-3 text-right font-semibold">Số km</th>
                  <th className="px-5 py-3 text-right font-semibold">Lượt vào</th>
                  <th className="px-5 py-3 font-semibold">Gần nhất</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-mono font-semibold">{v.licensePlate}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        {v.make} {v.model}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {[v.year, v.color, v.fuelType ? FUEL_LABELS[v.fuelType] : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {v.customerName ? (
                        <>
                          <div>{v.customerName}</div>
                          <div className="text-xs text-zinc-500">{v.customerPhone ?? ""}</div>
                        </>
                      ) : (
                        <Badge tone="orange">Chưa gắn chủ xe</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-300">
                      {v.odometer ? v.odometer.toLocaleString("vi-VN") : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">{v.orderCount}</td>
                    <td className="px-5 py-3 text-zinc-400">{formatDate(v.lastVisitAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openHistory(v)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                          title="Lịch sử dịch vụ"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(v)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                          title="Sửa"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(v)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                          title="Xoá"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {(creating || editing) && (
        <Modal
          title={editing ? `Sửa xe ${editing.licensePlate}` : "Thêm hồ sơ xe"}
          onClose={closeModal}
          wide
          footer={
            <>
              <GhostButton type="button" onClick={closeModal}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="vehicle-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </PrimaryButton>
            </>
          }
        >
          <form id="vehicle-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Biển số"
              required
              hint="tự chuẩn hoá: 30A-123.45 → 30A12345"
              value={form.licensePlate}
              onChange={update("licensePlate")}
            />
            <SelectField label="Chủ xe" value={form.customerId} onChange={update("customerId")}>
              <option value="">— Chưa gắn chủ xe —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </SelectField>
            <TextField label="Hãng" required placeholder="Toyota" value={form.make} onChange={update("make")} />
            <TextField label="Dòng xe" required placeholder="Vios" value={form.model} onChange={update("model")} />
            <TextField label="Năm sản xuất" type="number" value={form.year} onChange={update("year")} />
            <TextField label="Màu" value={form.color} onChange={update("color")} />
            <TextField label="Số VIN" value={form.vin} onChange={update("vin")} />
            <TextField label="Số máy" value={form.engineNumber} onChange={update("engineNumber")} />
            <SelectField label="Nhiên liệu" value={form.fuelType} onChange={update("fuelType")}>
              <option value="">—</option>
              <option value="gasoline">Xăng</option>
              <option value="diesel">Dầu (Diesel)</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Điện</option>
            </SelectField>
            <SelectField label="Hộp số" value={form.transmission} onChange={update("transmission")}>
              <option value="">—</option>
              <option value="manual">Số sàn</option>
              <option value="automatic">Số tự động</option>
            </SelectField>
            <TextField
              label="Số km hiện tại"
              type="number"
              value={form.odometer}
              onChange={update("odometer")}
            />
            <div className="sm:col-span-2">
              <TextAreaField label="Ghi chú" value={form.note} onChange={update("note")} />
            </div>
          </form>
        </Modal>
      )}

      {history && (
        <Modal
          title={`Lịch sử dịch vụ — ${history.vehicle.licensePlate}`}
          onClose={() => setHistory(null)}
          wide
        >
          {history.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              Xe này chưa từng vào xưởng.
            </p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Mã lệnh</th>
                    <th className="py-2 pr-4 font-semibold">Ngày vào</th>
                    <th className="py-2 pr-4 text-right font-semibold">Số km</th>
                    <th className="py-2 pr-4 font-semibold">Khách báo</th>
                    <th className="py-2 text-right font-semibold">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{row.code}</td>
                      <td className="py-2 pr-4 text-zinc-400">{formatDate(row.receivedAt)}</td>
                      <td className="py-2 pr-4 text-right">
                        {row.odometerIn ? row.odometerIn.toLocaleString("vi-VN") : "—"}
                      </td>
                      <td className="py-2 pr-4 text-zinc-400">{row.customerComplaint ?? "—"}</td>
                      <td className="py-2 text-right font-semibold">{formatVnd(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xoá hồ sơ xe"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setDeleting(null)}>
                Huỷ
              </GhostButton>
              <DangerButton onClick={handleDelete} disabled={saving}>
                {saving ? "Đang xoá..." : "Xoá"}
              </DangerButton>
            </>
          }
        >
          <p className="text-sm text-zinc-300">
            Xoá hồ sơ xe <b className="font-mono">{deleting.licensePlate}</b>?
          </p>
          {deleting.orderCount > 0 && (
            <p className="mt-2 text-xs text-orange-300">
              Xe này có {deleting.orderCount} lệnh sửa chữa — hệ thống sẽ từ chối xoá để giữ
              nguyên lịch sử.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
