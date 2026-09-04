"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import FloatingInput from "@/components/FloatingInput";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Không thể tạo tài khoản.");

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tài khoản. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      brandTitle="ANSER Auto"
      brandSubtitle="Phần mềm điều hành gara: tiếp nhận xe, lập lệnh sửa chữa, quản lý kho phụ tùng và chăm sóc khách hàng trên cùng một hệ thống."
      formTitle="Tạo tài khoản"
      formSubtitle="Bắt đầu quản lý xưởng dịch vụ của bạn"
      switchText="Đã có tài khoản?"
      switchLinkLabel="Đăng nhập"
      switchHref="/login"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FloatingInput id="firstName" label="Họ" value={form.firstName} onChange={update("firstName")} required />
          <FloatingInput id="lastName" label="Tên" value={form.lastName} onChange={update("lastName")} required />
        </div>
        <FloatingInput id="email" type="email" label="Địa chỉ Email" value={form.email} onChange={update("email")} required />
        <FloatingInput id="phone" label="Số điện thoại" value={form.phone} onChange={update("phone")} />
        <FloatingInput
          id="password"
          type="password"
          label="Mật khẩu (tối thiểu 6 ký tự)"
          value={form.password}
          onChange={update("password")}
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white py-4 text-[15px] font-bold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(255,255,255,0.2)] disabled:opacity-60"
        >
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>
      </form>
    </AuthShell>
  );
}
