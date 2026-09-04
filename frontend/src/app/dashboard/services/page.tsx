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
  formatVnd,
} from "@/components/ui/PageShell";

const CATEGORIES = [
  "Bảo dưỡng định kỳ",
  "Sửa chữa máy",
  "Gầm - Lái - Phanh",
  "Điện - Điều hoà",
  "Đồng - Sơn",
  "Lốp - La-zăng",
  "Kiểm tra - Chẩn đoán",
];

type Service = {
  id: string;
  code: string;
  name: string;
  category: string;
  standardMinutes: number;
  laborPrice: number;
  description: string | null;
  active: boolean;
};

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h}g${String(m).padStart(2, "0")}`;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [suggestedCode, setSuggestedCode] = useState("DV-001");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    category: CATEGORIES[0],
    standardMinutes: "60",
    laborPrice: 0,
    description: "",
    active: true,
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Không tải được bảng giá.");
      setServices(data.services);
      setSuggestedCode(data.suggestedCode);
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

  function openCreate() {
    setForm({
      code: suggestedCode,
      name: "",
      category: CATEGORIES[0],
      standardMinutes: "60",
      laborPrice: 0,
      description: "",
      active: true,
    });
    setCreating(true);
  }

  function openEdit(s: Service) {
    setForm({
      code: s.code,
      name: s.name,
      category: s.category,
      standardMinutes: String(s.standardMinutes),
      laborPrice: s.laborPrice,
      description: s.description ?? "",
      active: s.active,
    });
    setEditing(s);
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
      const res = await fetch(editing ? `/api/services/${editing.id}` : "/api/services", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, standardMinutes: Number(form.standardMinutes) }),
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
      const res = await fetch(`/api/services/${deleting.id}`, { method: "DELETE" });
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
        title="Bảng giá dịch vụ"
        subtitle="Hạng mục công lao động, giờ công định mức và giá bán."
        action={
          <PrimaryButton onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> Thêm hạng mục
          </PrimaryButton>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã hoặc tên hạng mục..."
          className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
        />
      </div>

      <Card>
        {loading ? (
          <EmptyState title="Đang tải..." />
        ) : services.length === 0 ? (
          <EmptyState title="Chưa có hạng mục nào." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.08] text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã</th>
                  <th className="px-5 py-3 font-semibold">Hạng mục</th>
                  <th className="px-5 py-3 font-semibold">Nhóm</th>
                  <th className="px-5 py-3 text-right font-semibold">Định mức</th>
                  <th className="px-5 py-3 text-right font-semibold">Giá công</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-400">{s.code}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={s.active ? "" : "text-zinc-500 line-through"}>{s.name}</span>
                        {!s.active && <Badge tone="zinc">Ngừng bán</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{s.category}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">
                      {formatMinutes(s.standardMinutes)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatVnd(s.laborPrice)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                          title="Sửa"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(s)}
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
          title={editing ? "Sửa hạng mục" : "Thêm hạng mục"}
          onClose={closeModal}
          footer={
            <>
              <GhostButton type="button" onClick={closeModal}>
                Huỷ
              </GhostButton>
              <PrimaryButton type="submit" form="service-form" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </PrimaryButton>
            </>
          }
        >
          <form id="service-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Mã" required value={form.code} onChange={update("code")} />
              <SelectField label="Nhóm" required value={form.category} onChange={update("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextField label="Tên hạng mục" required value={form.name} onChange={update("name")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Giờ công định mức (phút)"
                type="number"
                required
                min={1}
                hint="cơ sở báo giá và xếp lịch xưởng"
                value={form.standardMinutes}
                onChange={update("standardMinutes")}
              />
              <MoneyField
                label="Giá công"
                value={form.laborPrice}
                onValueChange={(v) => setForm((p) => ({ ...p, laborPrice: v }))}
              />
            </div>
            <TextAreaField
              label="Mô tả"
              value={form.description}
              onChange={update("description")}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="h-4 w-4 accent-orange-500"
              />
              Đang bán (hiện trong danh sách chọn khi lập lệnh)
            </label>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xoá hạng mục"
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
            Xoá hạng mục <b>{deleting.name}</b>?
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Các lệnh sửa chữa đã dùng hạng mục này không bị ảnh hưởng — dòng công đã lưu lại
            tên và giá tại thời điểm lập. Nếu chỉ muốn ngừng bán, hãy bỏ tick &ldquo;Đang
            bán&rdquo; thay vì xoá.
          </p>
        </Modal>
      )}
    </div>
  );
}
