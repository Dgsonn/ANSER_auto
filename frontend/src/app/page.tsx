import Link from "next/link";
import AmbientOrbs from "@/components/AmbientOrbs";

const features = [
  {
    title: "Tiếp nhận & lệnh sửa chữa",
    desc: "Từ lúc xe vào cổng tới khi giao xe: lời khai của khách, chẩn đoán, báo giá, giao việc cho kỹ thuật viên — trên cùng một phiếu.",
  },
  {
    title: "Hồ sơ xe theo biển số",
    desc: "Lịch sử dịch vụ đi theo xe chứ không theo chủ xe, nên sang tên đổi chủ vẫn tra cứu được đầy đủ.",
  },
  {
    title: "Kho phụ tùng theo chi nhánh",
    desc: "Tồn kho độc lập từng gara, giá vốn theo lô nhập, xuất phụ tùng gắn thẳng vào lệnh sửa chữa.",
  },
  {
    title: "Nhắc việc tự động",
    desc: "Phụ tùng sắp hết, xe tới hạn bảo dưỡng, lịch hẹn ngày mai — n8n gửi đi, không cần ai phải nhớ.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030305] text-white">
      <AmbientOrbs />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col px-6">
        <nav className="flex items-center justify-between py-6">
          <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="bg-gradient-to-br from-orange-400 to-amber-300 bg-clip-text text-transparent">
              ▲
            </span>
            ANSER Auto
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
            >
              Dùng thử
            </Link>
          </div>
        </nav>

        <header className="py-20 sm:py-28">
          <p className="mb-4 text-xs font-bold tracking-[0.2em] text-orange-400 uppercase">
            Dịch vụ sửa chữa ô tô
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
            Điều hành cả xưởng dịch vụ từ một màn hình
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            ANSER Auto gom lịch hẹn, lệnh sửa chữa, kho phụ tùng, hoá đơn và chăm sóc khách hàng
            về cùng một nơi — để cố vấn dịch vụ trả lời được &ldquo;xe tôi xong chưa?&rdquo; mà
            không cần chạy xuống xưởng hỏi.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-white px-6 py-3.5 text-[15px] font-bold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(255,255,255,0.2)]"
            >
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/[0.12] px-6 py-3.5 text-[15px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06]"
            >
              Xem bản demo
            </Link>
          </div>
        </header>

        <section className="grid gap-4 pb-24 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-orange-500/30"
            >
              <h3 className="mb-2 text-base font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-white/[0.08] py-8 text-sm text-zinc-500">
          ANSER Auto — mảng dịch vụ sửa chữa ô tô của nền tảng ANSER.
        </footer>
      </div>
    </div>
  );
}
