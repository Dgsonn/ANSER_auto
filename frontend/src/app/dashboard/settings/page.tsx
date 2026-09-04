"use client";

import { FormEvent, useEffect, useState } from "react";
import { MoneyField, SelectField, TextField } from "@/components/ui/Field";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  PrimaryButton,
} from "@/components/ui/PageShell";

type Settings = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  currency: string;
  defaultTaxRate: number;
  defaultLaborRate: number;
  maintenanceIntervalDays: number;
  maintenanceIntervalKm: number;
};

export default function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/company")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) setForm(data.settings);
        else setError(data?.message ?? "Không tải được cài đặt.");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Không tải được cài đặt.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không lưu được.");
      setForm(data.settings);
      setError(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <EmptyState title="Đang tải..." />;
  if (!form) return <ErrorBanner message={error ?? "Không tải được cài đặt."} />;

  const update = (field: keyof Settings) => (e: { target: { value: string } }) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Cài đặt" subtitle="Thông tin doanh nghiệp và mặc định nghiệp vụ." />

      <ErrorBanner message={error} />
      {saved && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          Đã lưu.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">Thông tin doanh nghiệp</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField label="Tên gara" required value={form.name} onChange={update("name")} />
            </div>
            <div className="sm:col-span-2">
              <TextField label="Địa chỉ" value={form.address ?? ""} onChange={update("address")} />
            </div>
            <TextField label="Số điện thoại" value={form.phone ?? ""} onChange={update("phone")} />
            <TextField
              label="Email"
              type="email"
              hint="nhận báo cáo và cảnh báo tự động"
              value={form.email ?? ""}
              onChange={update("email")}
            />
            <TextField label="Mã số thuế" value={form.taxCode ?? ""} onChange={update("taxCode")} />
            <SelectField label="Đơn vị tiền tệ" value={form.currency} onChange={update("currency")}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </SelectField>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">Mặc định nghiệp vụ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Thuế VAT mặc định (%)"
              type="number"
              min={0}
              max={100}
              hint="điền sẵn khi xuất hoá đơn"
              value={String(form.defaultTaxRate)}
              onChange={update("defaultTaxRate")}
            />
            <MoneyField
              label="Đơn giá công mặc định (/giờ)"
              value={form.defaultLaborRate}
              onValueChange={(v) => setForm((p) => (p ? { ...p, defaultLaborRate: v } : p))}
            />
            <TextField
              label="Chu kỳ bảo dưỡng (ngày)"
              type="number"
              min={1}
              hint="dùng để đặt mốc kế tiếp khi giao xe"
              value={String(form.maintenanceIntervalDays)}
              onChange={update("maintenanceIntervalDays")}
            />
            <TextField
              label="Chu kỳ bảo dưỡng (km)"
              type="number"
              min={1}
              value={String(form.maintenanceIntervalKm)}
              onChange={update("maintenanceIntervalKm")}
            />
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Hai chu kỳ trên được áp dụng ngay khi chuyển lệnh sang &ldquo;Đã giao xe&rdquo; để
            tính mốc bảo dưỡng kế tiếp cho xe. Đổi ở đây chỉ ảnh hưởng các lần giao xe sau,
            không tính lại mốc của xe đã giao trước đó.
          </p>
        </Card>

        <div>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
