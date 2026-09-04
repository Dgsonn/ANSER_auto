"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/dashboard/icons";
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

type Customer = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  note: string | null;
  vehicleCount: number;
  orderCount: number;
  totalSpent: number;
  lastVisitAt: string | null;
};

const EMPTY_FORM = {
  name: "",
  type: "individual",
  phone: "",
  email: "",
  address: "",
  taxCode: "",
  note: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được danh sách.");
      setCustomers(data.customers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Trì hoãn 300ms để mỗi phím gõ không thành một request — danh sách khách có thể dài.
  useEffect(() => {
    const timer = setTimeout(() => load(search), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  function openEdit(customer: Customer) {
    setForm({
      name: customer.name,
      type: customer.type,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      taxCode: customer.taxCode ?? "",
      note: customer.note ?? "",
    });
    setEditing(customer);
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
      const url = editing ? `/api/customers/${editing.id}` : "/api/customers";
      const res = await fetch(url, {
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
      const res = await fetch(`/api/customers/${deleting.id}`, { method: "DELETE" });
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

  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        subtitle="Hồ sơ khách và lịch sử sử dụng dịch vụ."
        action={
          <PrimaryButton onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> Thêm khách hàng
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, số điện thoại hoặc email..."
          className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
        />
      </div>

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : customers.length === 0 ? (
          <EmptyState
            title={search ? "Không tìm thấy khách hàng nào." : "Chưa có khách hàng nào."}
            hint={search ? undefined : 'Bấm "Thêm khách hàng" để tạo hồ sơ đầu tiên.'}
          />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Khách hàng</th>
                  <th className="px-5 py-3 font-semibold">Liên hệ</th>
                  <th className="px-5 py-3 text-right font-semibold">Xe</th>
                  <th className="px-5 py-3 text-right font-semibold">Lượt vào xưởng</th>
                  <th className="px-5 py-3 text-right font-semibold">Tổng chi tiêu</th>
                  <th className="px-5 py-3 font-semibold">Gần nhất</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <Badge tone={c.type === "company" ? "violet" : "zinc"}>
                        {c.type === "company" ? "Doanh nghiệp" : "Cá nhân"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
                      <div>{c.phone ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{c.email ?? ""}</div>
                    </td>
                    <td className="px-5 py-3 text-right">{c.vehicleCount}</td>
                    <td className="px-5 py-3 text-right">{c.orderCount}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatVnd(c.totalSpent)}</td>
                    <td className="px-5 py-3 text-zinc-400">{formatDate(c.lastVisitAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                          title="Sửa"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
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
          title={editing ? "Sửa khách hàng" : "Thêm khách hàng"}
          onClose={closeModal}
          footer={
            <>
              <GhostButton type="button" onClick={closeModal}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="customer-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </PrimaryButton>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField label="Tên khách hàng" required value={form.name} onChange={update("name")} />
            <SelectField label="Loại khách" value={form.type} onChange={update("type")}>
              <option value="individual">Cá nhân</option>
              <option value="company">Doanh nghiệp</option>
            </SelectField>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Số điện thoại" value={form.phone} onChange={update("phone")} />
              <TextField
                label="Email"
                type="email"
                hint="cần cho nhắc bảo dưỡng tự động"
                value={form.email}
                onChange={update("email")}
              />
            </div>
            <TextField label="Địa chỉ" value={form.address} onChange={update("address")} />
            {form.type === "company" && (
              <TextField label="Mã số thuế" value={form.taxCode} onChange={update("taxCode")} />
            )}
            <TextAreaField label="Ghi chú" value={form.note} onChange={update("note")} />
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xoá khách hàng"
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
            Xoá hồ sơ khách <b>{deleting.name}</b>?
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {deleting.vehicleCount > 0 || deleting.orderCount > 0
              ? `${deleting.vehicleCount} xe và ${deleting.orderCount} lệnh sửa chữa sẽ được giữ lại nhưng không còn gắn với khách nào — lịch sử dịch vụ thuộc về chiếc xe, không thuộc về người đứng tên.`
              : "Khách này chưa có xe hay lệnh sửa chữa nào."}
          </p>
        </Modal>
      )}
    </div>
  );
}
