"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/dashboard/icons";
import { MoneyField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
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

const POSITIONS = ["Kỹ thuật viên", "Cố vấn dịch vụ", "Thủ kho", "Quản đốc", "Lễ tân", "Kế toán"];
const SPECIALTIES = [
  "Máy - Hộp số",
  "Gầm - Treo - Phanh",
  "Điện thân xe",
  "Điều hoà",
  "Đồng - Sơn",
  "Lốp - Cân chỉnh",
];

type Employee = {
  id: string;
  name: string;
  position: string | null;
  specialty: string | null;
  hourlyCost: number | null;
  phone: string | null;
  email: string | null;
  hireDate: string | null;
  branchId: string | null;
  active: boolean;
  note: string | null;
};

const EMPTY = {
  name: "",
  position: POSITIONS[0],
  specialty: "",
  hourlyCost: 0,
  phone: "",
  email: "",
  hireDate: "",
  branchId: "",
  note: "",
  active: true,
};

export default function StaffPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/employees");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.message ?? "Không tải được danh sách nhân sự.");
      setLoading(false);
      return;
    }
    setEmployees(data.employees);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/employees").then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
      fetch("/api/branches").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([e, b]) => {
        if (cancelled) return;
        if (e.ok) setEmployees(e.d.employees);
        else setError(e.d?.message ?? "Không tải được danh sách nhân sự.");
        if (b) setBranches(b.branches);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được danh sách nhân sự.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openEdit(e: Employee) {
    setForm({
      name: e.name,
      position: e.position ?? POSITIONS[0],
      specialty: e.specialty ?? "",
      hourlyCost: e.hourlyCost ?? 0,
      phone: e.phone ?? "",
      email: e.email ?? "",
      hireDate: e.hireDate ? e.hireDate.slice(0, 10) : "",
      branchId: e.branchId ?? "",
      note: e.note ?? "",
      active: e.active,
    });
    setEditing(e);
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/employees/${editing.id}` : "/api/employees", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không lưu được.");
      setCreating(false);
      setEditing(null);
      await load();
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
      const res = await fetch(`/api/employees/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Không xoá được.");
      }
      setDeleting(null);
      await load();
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
        title="Nhân sự"
        subtitle="Hồ sơ nhân viên xưởng — tách riêng khỏi tài khoản đăng nhập."
        action={
          <PrimaryButton
            onClick={() => {
              setForm({ ...EMPTY, branchId: branches[0]?.id ?? "" });
              setCreating(true);
            }}
          >
            <PlusIcon className="h-4 w-4" /> Thêm nhân sự
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : employees.length === 0 ? (
          <EmptyState title="Chưa có nhân sự nào." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Họ tên</th>
                  <th className="px-5 py-3 font-semibold">Chức vụ</th>
                  <th className="px-5 py-3 font-semibold">Chuyên môn</th>
                  <th className="px-5 py-3 font-semibold">Liên hệ</th>
                  <th className="px-5 py-3 text-right font-semibold">Đơn giá công</th>
                  <th className="px-5 py-3 font-semibold">Vào làm</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className={e.active ? "font-semibold" : "text-zinc-500 line-through"}>
                        {e.name}
                      </div>
                      {!e.active && <Badge tone="zinc">Đã nghỉ</Badge>}
                    </td>
                    <td className="px-5 py-3 text-zinc-300">{e.position ?? "—"}</td>
                    <td className="px-5 py-3 text-zinc-400">{e.specialty ?? "—"}</td>
                    <td className="px-5 py-3 text-zinc-400">
                      <div>{e.phone ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{e.email ?? ""}</div>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-300">
                      {e.hourlyCost ? `${formatVnd(e.hourlyCost)}/giờ` : "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{formatDate(e.hireDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(e)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
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
          title={editing ? "Sửa hồ sơ nhân sự" : "Thêm nhân sự"}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          wide
          footer={
            <>
              <GhostButton
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="staff-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </PrimaryButton>
            </>
          }
        >
          <form id="staff-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <TextField label="Họ tên" required value={form.name} onChange={update("name")} />
            <SelectField label="Chức vụ" value={form.position} onChange={update("position")}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </SelectField>
            <SelectField label="Chuyên môn" value={form.specialty} onChange={update("specialty")}>
              <option value="">—</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <SelectField label="Chi nhánh" value={form.branchId} onChange={update("branchId")}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Số điện thoại" value={form.phone} onChange={update("phone")} />
            <TextField label="Email" type="email" value={form.email} onChange={update("email")} />
            <MoneyField
              label="Đơn giá công (VND/giờ)"
              hint="chi phí nhân công thực tế, khác giá bán công"
              value={form.hourlyCost}
              onValueChange={(v) => setForm((p) => ({ ...p, hourlyCost: v }))}
            />
            <TextField
              label="Ngày vào làm"
              type="date"
              value={form.hireDate}
              onChange={update("hireDate")}
            />
            <div className="sm:col-span-2">
              <TextAreaField label="Ghi chú" value={form.note} onChange={update("note")} />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="h-4 w-4 accent-orange-500"
              />
              Đang làm việc (hiện trong danh sách phân công)
            </label>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xoá nhân sự"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setDeleting(null)}>
                Huỷ
              </GhostButton>
              <DangerButton onClick={handleDelete} disabled={saving}>
                Xoá
              </DangerButton>
            </>
          }
        >
          <p className="text-sm text-zinc-300">
            Xoá hồ sơ <b>{deleting.name}</b>?
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Nhân sự đã được giao việc trên lệnh sửa chữa sẽ bị từ chối xoá. Với người đã nghỉ,
            nên bỏ tick &ldquo;Đang làm việc&rdquo; để giữ lại lịch sử phân công.
          </p>
        </Modal>
      )}
    </div>
  );
}
