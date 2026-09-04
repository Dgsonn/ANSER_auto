"use client";

import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-orange-500 disabled:opacity-50";

function Label({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline gap-2">
      <span className="text-xs font-semibold text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-orange-400">*</span>}
      </span>
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </span>
  );
}

type BaseProps = { label: string; hint?: string };

export function TextField({
  label,
  hint,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <Label label={label} required={rest.required} hint={hint} />
      <input className={inputClass} {...rest} />
    </label>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...rest
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="block">
      <Label label={label} required={rest.required} hint={hint} />
      {/* bg-black trên <option> vì trình duyệt vẽ dropdown bằng màu hệ thống — không đặt
          thì chữ trắng trên nền trắng, không đọc được trên Windows. */}
      <select className={`${inputClass} [&>option]:bg-zinc-900`} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  hint,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <Label label={label} required={rest.required} hint={hint} />
      <textarea className={`${inputClass} min-h-20 resize-y`} {...rest} />
    </label>
  );
}

// Ô nhập tiền: giữ giá trị là number nhưng hiện dấu phân cách hàng nghìn khi không focus.
// Gõ "1500000" mà không thấy nhóm số là cách dễ nhất để lệch một số 0 mà không ai nhận ra.
export function MoneyField({
  label,
  hint,
  value,
  onValueChange,
  ...rest
}: BaseProps & {
  value: number;
  onValueChange: (v: number) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <Label label={label} required={rest.required} hint={hint} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={`${inputClass} pr-8`}
          value={value ? value.toLocaleString("vi-VN") : ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onValueChange(digits ? Number(digits) : 0);
          }}
          {...rest}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-zinc-500">
          ₫
        </span>
      </div>
    </label>
  );
}
