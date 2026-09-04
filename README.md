# ANSER Auto

Mảng **dịch vụ sửa chữa ô tô** của nền tảng ANSER. Sản phẩm độc lập, dựng theo đúng khuôn
hạ tầng của [ANSER Web v2](../ANSER-web-v2) (mảng bán lẻ/kho) nhưng có mô hình dữ liệu riêng
cho gara: hồ sơ xe, lệnh sửa chữa, bảng giá dịch vụ, kho phụ tùng, lịch hẹn, hoá đơn.

Một project Next.js duy nhất (`frontend/`) — vừa là UI vừa là backend (Route Handlers).

## Cấu trúc

```
ANSER_methuy/
├── ARCHITECTURE.md      Kiến trúc, mô hình dữ liệu, các quyết định thiết kế
├── STACK_DECISIONS.md   Vì sao chọn stack này, hướng tách AI/n8n
└── frontend/            Next.js (TypeScript, App Router, Tailwind v4) — UI + /api/*
```

## Chạy trên máy

```bash
cd frontend
npm install
cp .env.local.example .env.local     # rồi điền JWT_SECRET và DATABASE_URL (Neon Postgres)
npm run db:migrate                   # tạo bảng
npm run dev                          # http://localhost:3000
```

Tài khoản demo được seed tự động lúc server khởi động: `demo@anser.auto` / `demo1234` (role `admin`).

Tự động hoá (tuỳ chọn):

```bash
cd frontend
docker compose up -d                 # n8n tại :5681, MailHog tại :8027
```

## Trạng thái hiện tại

Gara dùng được cho luồng nghiệp vụ chính. **12/12 mục trong sidebar đã hoạt động**:

| Màn hình | Làm được gì |
|---|---|
| Tổng quan | KPI xe trong xưởng / lịch hẹn / doanh thu, phụ tùng sắp hết, xe tới hạn bảo dưỡng |
| Lịch hẹn | Đặt lịch (kể cả khách chưa có hồ sơ), đổi trạng thái, huỷ |
| Lệnh sửa chữa | Tiếp nhận xe → chẩn đoán → báo giá → thi công → hoàn tất → giao xe; thêm dòng công, giao việc cho KTV, xuất phụ tùng (tự trừ kho), giảm giá |
| Khách hàng | CRUD, thống kê số xe / lượt vào xưởng / tổng chi tiêu |
| Hồ sơ xe | CRUD, chuẩn hoá biển số, lịch sử dịch vụ theo xe |
| Bảng giá dịch vụ | CRUD hạng mục, giờ công định mức, giá công |
| Kho phụ tùng | CRUD, phiếu nhập/xuất có transaction, cảnh báo tồn thấp theo ngưỡng riêng |
| Hoá đơn | Xuất từ lệnh đã hoàn tất, VAT, ghi nhận thanh toán, theo dõi công nợ |
| Báo cáo | Doanh thu ngày/tuần/tháng, cơ cấu công vs phụ tùng, top hạng mục và phụ tùng |
| Tự động hoá | Bật/tắt workflow n8n thật, xem lịch sử chạy, sửa ngưỡng, xem/tải mẫu workflow JSON ngay trên UI |
| Nhân sự | CRUD hồ sơ nhân viên, chức vụ, chuyên môn, đơn giá công |
| Cài đặt | Thông tin doanh nghiệp, VAT mặc định, chu kỳ bảo dưỡng |

Nền tảng: 16 bảng Postgres, auth JWT + phân quyền 3 cấp, `proxy.ts` chặn `/dashboard`,
mã chứng từ sinh bằng Postgres sequence, 5 workflow n8n + endpoint nội bộ có token.

**Còn thiếu** — xem mục 10 của `ARCHITECTURE.md`: nút xoá tài khoản đăng nhập (sửa/gán được,
chưa xoá được), validate bằng `zod`, rate-limit đăng nhập, index DB, in hoá đơn, và chưa xác
nhận workflow n8n tự chạy đúng giờ theo lịch (đã import + Active thật, mới test bằng tay).
