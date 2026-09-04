"use client";

import { ReactNode, useEffect } from "react";
import { XIcon } from "@/components/dashboard/icons";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export default function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  // Esc để đóng: modal ở đây luôn chứa form, và mất nửa biểu mẫu vì lỡ tay thì khó chịu
  // hơn nhiều so với phải bấm đúng nút X.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div
        className={`relative my-auto w-full rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Đóng"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-white/[0.08] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
