"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/dashboard/icons";
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
  formatDate,
  formatVnd,
} from "@/components/ui/PageShell";

const STATUS_LABELS: Record<string, string> = {
  received: "Đã tiếp nhận",
  diagnosing: "Đang chẩn đoán",
  quoted: "Đã báo giá",
  approved: "Khách đã duyệt",
  in_progress: "Đang sửa chữa",
  completed: "Hoàn tất",
  delivered: "Đã giao xe",
  cancelled: "Đã huỷ",
};

const STATUS_TONES: Record<string, "zinc" | "sky" | "orange" | "emerald" | "red" | "violet"> = {
  received: "zinc",
  diagnosing: "sky",
  quoted: "violet",
  approved: "violet",
  in_progress: "orange",
  completed: "emerald",
  delivered: "emerald",
  cancelled: "red",
};

type Order = {
  id: string;
  code: string;
  status: string;
  plateSnapshot: string;
  receivedAt: string;
  promisedAt: string | null;
  total: number;
  customerName: string | null;
  customerPhone: string | null;
  vehicleLabel: string;
  branchName: string;
  advisorName: string | null;
  hasInvoice: boolean;
};

type Vehicle = { id: string; licensePlate: string; make: string; model: string; customerId: string | null; odometer: number | null };
type Branch = { id: string; name: string };
type Employee = { id: string; name: string; position: string | null };

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    branchId: "",
    advisorId: "",
    odometerIn: "",
    customerComplaint: "",
    promisedAt: "",
    note: "",
  });

  const load = useCallback(async (term: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set("search", term);
      if (status) params.set("status", status);
      const res = await fetch(`/api/service-orders?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được danh sách.");
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search, statusFilter), 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, load]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/branches").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/employees?activeOnly=1").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([v, b, e]) => {
        if (v) setVehicles(v.vehicles);
        if (b) setBranches(b.branches);
        if (e) setEmployees(e.employees);
      })
      .catch(() => {});
  }, []);

  function openCreate() {
    setForm({
      vehicleId: "",
      branchId: branches[0]?.id ?? "",
      advisorId: "",
      odometerIn: "",
      customerComplaint: "",
      promisedAt: "",
      note: "",
    });
    setCreating(true);
  }

  // Chọn xe thì điền sẵn số km đang lưu — lễ tân chỉ cần sửa nếu đồng hồ đã nhích lên.
  function pickVehicle(vehicleId: string) {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId,
      odometerIn: vehicle?.odometer ? String(vehicle.odometer) : prev.odometerIn,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không tạo được lệnh.");
      setCreating(false);
      // Vào thẳng trang chi tiết: tiếp nhận xong là phải thêm hạng mục ngay, quay lại
      // danh sách rồi bấm vào là thừa một bước.
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setSaving(false);
    }
  }

  const advisors = employees.filter(
    (e) => !e.position || ["Cố vấn dịch vụ", "Quản đốc", "Lễ tân"].includes(e.position),
  );

  return (
    <div>
      <PageHeader
        title="Lệnh sửa chữa"
        subtitle="Từ tiếp nhận xe tới giao xe."
        action={
          <PrimaryButton onClick={openCreate} disabled={vehicles.length === 0 || branches.length === 0}>
            <PlusIcon className="h-4 w-4" /> Tiếp nhận xe
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      {vehicles.length === 0 && !loading && (
        <div className="mb-4 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-200">
          Chưa có hồ sơ xe nào — tạo hồ sơ xe ở mục{" "}
          <Link href="/dashboard/vehicles" className="font-semibold underline">
            Hồ sơ xe
          </Link>{" "}
          trước khi tiếp nhận.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã lệnh, biển số hoặc tên khách..."
          className="min-w-64 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500 sm:max-w-sm sm:flex-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 [&>option]:bg-zinc-900"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : orders.length === 0 ? (
          <EmptyState
            title={search || statusFilter ? "Không có lệnh nào khớp." : "Chưa có lệnh sửa chữa nào."}
            hint={search || statusFilter ? undefined : 'Bấm "Tiếp nhận xe" để mở lệnh đầu tiên.'}
          />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã lệnh</th>
                  <th className="px-5 py-3 font-semibold">Xe</th>
                  <th className="px-5 py-3 font-semibold">Khách hàng</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Ngày vào</th>
                  <th className="px-5 py-3 font-semibold">Hẹn trả</th>
                  <th className="px-5 py-3 text-right font-semibold">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                    className="cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs font-semibold">{o.code}</div>
                      {o.hasInvoice && <Badge tone="emerald">Đã xuất hoá đơn</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-mono">{o.plateSnapshot}</div>
                      <div className="text-xs text-zinc-500">{o.vehicleLabel}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div>{o.customerName ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{o.customerPhone ?? ""}</div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONES[o.status] ?? "zinc"}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{formatDate(o.receivedAt)}</td>
                    <td className="px-5 py-3 text-zinc-400">{formatDate(o.promisedAt)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatVnd(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {creating && (
        <Modal
          title="Tiếp nhận xe"
          onClose={() => setCreating(false)}
          wide
          footer={
            <>
              <GhostButton type="button" onClick={() => setCreating(false)}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="order-form" disabled={saving}>
                {saving ? "Đang tạo..." : "Tạo lệnh"}
              </PrimaryButton>
            </>
          }
        >
          <form id="order-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <SelectField
                label="Xe"
                required
                value={form.vehicleId}
                onChange={(e) => pickVehicle(e.target.value)}
              >
                <option value="">— Chọn xe —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} — {v.make} {v.model}
                  </option>
                ))}
              </SelectField>
            </div>
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
              label="Cố vấn dịch vụ"
              value={form.advisorId}
              onChange={(e) => setForm((p) => ({ ...p, advisorId: e.target.value }))}
            >
              <option value="">—</option>
              {advisors.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Số km lúc vào"
              type="number"
              value={form.odometerIn}
              onChange={(e) => setForm((p) => ({ ...p, odometerIn: e.target.value }))}
            />
            <TextField
              label="Hẹn trả xe"
              type="datetime-local"
              value={form.promisedAt}
              onChange={(e) => setForm((p) => ({ ...p, promisedAt: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Khách báo lỗi gì"
                hint="lời khai của khách, chưa phải chẩn đoán"
                value={form.customerComplaint}
                onChange={(e) => setForm((p) => ({ ...p, customerComplaint: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                label="Ghi chú"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
