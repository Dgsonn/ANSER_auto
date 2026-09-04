"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { SelectField, TextField } from "@/components/ui/Field";
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

const ROLE_LABELS: Record<string, string> = { staff: "Nhân viên", manager: "Quản lý", admin: "Quản trị viên" };
const ASSIGNABLE_ROLES = ["staff", "manager"];

type Account = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  employeeId: string | null;
  employeeName: string | null;
  employeePosition: string | null;
};

type Employee = { id: string; name: string; position: string | null };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ role: "staff", employeeId: "" });

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "staff",
    employeeId: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [uRes, eRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/employees?activeOnly=1"),
    ]);
    const uData = await uRes.json().catch(() => null);
    if (!uRes.ok) {
      setError(uData?.message ?? "Không tải được danh sách tài khoản.");
      setLoading(false);
      return;
    }
    setAccounts(uData.users);
    if (eRes.ok) setEmployees((await eRes.json()).employees);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/users"), fetch("/api/employees?activeOnly=1")])
      .then(async ([uRes, eRes]) => {
        if (cancelled) return;
        const uData = await uRes.json().catch(() => null);
        if (!uRes.ok) {
          setError(uData?.message ?? "Không tải được danh sách tài khoản.");
          setLoading(false);
          return;
        }
        setAccounts(uData.users);
        if (eRes.ok) setEmployees((await eRes.json()).employees);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được danh sách tài khoản.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openEdit(account: Account) {
    setForm({ role: account.role, employeeId: account.employeeId ?? "" });
    setEditing(account);
  }

  function openCreate() {
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      role: "staff",
      employeeId: "",
    });
    setCreateError(null);
    setCreating(true);
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          email: createForm.email,
          phone: createForm.phone || undefined,
          password: createForm.password,
          role: createForm.role,
          employeeId: createForm.employeeId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không tạo được tài khoản.");
      setCreating(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: form.role, employeeId: form.employeeId || null }),
      });
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
        title="Tài khoản"
        subtitle="Gán vai trò và liên kết mỗi tài khoản đăng nhập với đúng 1 hồ sơ nhân sự — chức vụ của hồ sơ đó (Kế toán / Kỹ thuật viên) quyết định luồng giao diện tài khoản sẽ thấy."
        action={<PrimaryButton onClick={openCreate}>+ Cấp tài khoản</PrimaryButton>}
      />

      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : accounts.length === 0 ? (
          <EmptyState title="Chưa có tài khoản nào." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Họ tên</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Vai trò</th>
                  <th className="px-5 py-3 font-semibold">Hồ sơ nhân sự liên kết</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3 font-semibold">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{a.email}</td>
                    <td className="px-5 py-3">
                      <Badge tone={a.role === "admin" ? "violet" : a.role === "manager" ? "sky" : "zinc"}>
                        {ROLE_LABELS[a.role] ?? a.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
                      {a.employeeName ? `${a.employeeName} (${a.employeePosition ?? "—"})` : "— Chưa liên kết —"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {a.role === "admin" ? (
                        <span className="text-xs text-zinc-600">Không sửa được</span>
                      ) : (
                        <GhostButton onClick={() => openEdit(a)}>Sửa</GhostButton>
                      )}
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
          title="Cấp tài khoản cho nhân viên"
          onClose={() => setCreating(false)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setCreating(false)}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="create-account-form" disabled={saving}>
                {saving ? "Đang tạo..." : "Tạo tài khoản"}
              </PrimaryButton>
            </>
          }
        >
          <form
            id="create-account-form"
            onSubmit={handleCreateSubmit}
            className="flex flex-col gap-4"
          >
            <ErrorBanner message={createError} />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Họ"
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
              />
              <TextField
                label="Tên"
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>
            <TextField
              label="Email đăng nhập"
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            />
            <TextField
              label="Số điện thoại"
              value={createForm.phone}
              onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <TextField
              label="Mật khẩu tạm"
              type="text"
              required
              hint="ít nhất 6 ký tự — báo trực tiếp cho nhân viên, họ tự đổi sau khi đăng nhập lần đầu"
              value={createForm.password}
              onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
            />
            <SelectField
              label="Vai trò"
              value={createForm.role}
              onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Hồ sơ nhân sự liên kết"
              hint="quyết định luồng kế toán/KTV — bỏ trống = tài khoản dùng đủ tính năng"
              value={createForm.employeeId}
              onChange={(e) => setCreateForm((p) => ({ ...p, employeeId: e.target.value }))}
            >
              <option value="">— Không liên kết —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.position ? `(${emp.position})` : ""}
                </option>
              ))}
            </SelectField>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title={`Sửa tài khoản — ${editing.firstName} ${editing.lastName}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <GhostButton type="button" onClick={() => setEditing(null)}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="account-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </PrimaryButton>
            </>
          }
        >
          <form id="account-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <SelectField
              label="Vai trò"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Hồ sơ nhân sự liên kết"
              hint="quyết định luồng kế toán/KTV — bỏ trống = tài khoản dùng đủ tính năng"
              value={form.employeeId}
              onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
            >
              <option value="">— Không liên kết —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.position ? `(${emp.position})` : ""}
                </option>
              ))}
            </SelectField>
          </form>
        </Modal>
      )}
    </div>
  );
}
