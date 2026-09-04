# ANSER Auto — Kiến trúc & mô hình dữ liệu

Tài liệu này giải thích cấu trúc project, vai trò từng file, mô hình dữ liệu nghiệp vụ gara,
và **vì sao** từng quyết định được chọn. Viết cho người mới join hoặc AI agent đọc để nắm
nhanh hiện trạng mà không phải đọc lại toàn bộ lịch sử commit.

## 1. Tổng quan

**1 project Next.js duy nhất** (`frontend/`) — vừa là UI vừa là backend:

- UI: các trang trong `src/app/` (App Router).
- Backend: **Route Handlers** (`src/app/api/**/route.ts`) — chạy Node.js runtime, cùng
  process với UI, cùng origin. Không CORS, không `credentials: "include"`.
- Xác thực: JWT trong cookie `httpOnly` (`anser_auto_token`), phân quyền 3 cấp.
- Dữ liệu: **Neon Postgres** qua **Drizzle ORM** (driver `neon-serverless` dạng Pool/WebSocket
  — bắt buộc vì `neon-http` không hỗ trợ `db.transaction()`, mà xuất phụ tùng cho lệnh sửa
  chữa phải chạy trong transaction).
- Tự động hoá: n8n self-host (Docker), gọi 2 chiều qua webhook + Public API.

Khuôn hạ tầng lấy từ ANSER Web v2 (mảng bán lẻ). **Mô hình dữ liệu thì viết mới hoàn toàn** —
gara không phải cửa hàng bán lẻ có thêm dịch vụ: trung tâm nghiệp vụ là *chiếc xe* và *lệnh
sửa chữa*, không phải *sản phẩm* và *hoá đơn bán hàng*.

## 2. Cấu trúc thư mục

```
frontend/
├── .env.local.example
├── docker-compose.yml            n8n (:5681) + MailHog (:8027)
├── drizzle.config.ts
├── next.config.ts / postcss.config.mjs / eslint.config.mjs / tsconfig.json
├── n8n-workflows/                5 workflow JSON + README hướng dẫn import
└── src/
    ├── instrumentation.ts        chạy 1 lần lúc server khởi động → seed idempotent
    ├── proxy.ts                  chặn /dashboard (KHÔNG phải middleware.ts — xem mục 3)
    ├── lib/format.ts             formatVnd/formatDate — module THUẦN, xem mục 5.1
    ├── app/
    │   ├── layout.tsx, globals.css, page.tsx        landing
    │   ├── login/page.tsx, register/page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx (sidebar + topbar), page.tsx (Tổng quan)
    │   │   ├── appointments/, customers/, vehicles/, services/, parts/
    │   │   ├── orders/page.tsx + orders/[id]/page.tsx   ← trang chi tiết lệnh
    │   │   └── invoices/, reports/, automation/, staff/, settings/
    │   └── api/
    │       ├── health, auth/{register,login,logout,me}
    │       ├── branches, customers, vehicles, services, parts, employees
    │       ├── parts/transactions                        nhập/xuất kho lẻ
    │       ├── service-orders + [id]/{labors,parts,special-orders}
    │       ├── invoices, appointments, settings/company
    │       ├── automation/rules + [id]/executions        điều khiển n8n thật
    │       └── n8n/internal/{branches,low-stock,due-for-service,appointments,revenue}
    ├── components/
    │   ├── AmbientOrbs.tsx, AuthShell.tsx, FloatingInput.tsx
    │   ├── dashboard/{Sidebar,Topbar,StatCard,icons}.tsx
    │   └── ui/{Modal,Field,PageShell}.tsx               component dùng chung mọi trang
    └── server/
        ├── api.ts                helper lỗi + wrapper handle()
        ├── auth.ts               JWT, cookie
        ├── session.ts            getSessionUser(), requireRole()
        ├── internalAuth.ts       token cho endpoint n8n gọi server-to-server
        ├── domain.ts             hằng số nghiệp vụ (trạng thái, danh mục, nhãn tiếng Việt)
        ├── reports.ts            getOverviewSummary(), getRevenueReport()
        ├── n8n.ts                webhook fire-and-forget (không throw)
        ├── n8nApi.ts             n8n Public API (có throw)
        ├── db/
        │   ├── schema.ts         17 bảng + 2 sequence mã chứng từ
        │   ├── client.ts         singleton `db` khởi tạo lười
        │   └── migrations/0000_*.sql … 0003_*.sql
        └── store/
            ├── codes.ts          sinh mã chứng từ từ sequence
            ├── users, employees, branches, settings, seed
            ├── customers, vehicles, services, parts, appointments
            ├── serviceOrders     ← transaction phức tạp nhất, xem mục 9
            ├── specialOrders     phụ tùng đặt ngoài — xem mục 8.5
            ├── invoices, automation
```

### 5.1 Một cái bẫy đã dính

`formatVnd`/`formatDate` từng nằm trong `components/ui/PageShell.tsx` — file có `"use
client"`. Trang Báo cáo là Server Component, import vào là lỗi runtime *"Attempted to call
formatVnd() from the server but formatVnd is on the client"*. Build vẫn xanh, typecheck vẫn
xanh; chỉ khi mở trang mới nổ 500.

Nay chúng nằm ở `src/lib/format.ts` (module thuần, không directive), `PageShell` chỉ
re-export cho tiện. **Hàm dùng chung cho cả server lẫn client không được đặt trong file có
`"use client"`.**

## 3. Ba khác biệt so với ANSER Web v2

| | ANSER v2 | ANSER Auto | Lý do |
|---|---|---|---|
| Chặn `/dashboard` | Chưa có (hạn chế đã ghi nhận) | `src/proxy.ts` verify JWT | Next 16 chạy proxy trên **Node.js runtime**, nên verify được chữ ký ngay tại đó chứ không chỉ "có cookie hay không". Vẫn phải kiểm tra quyền ở từng route — proxy chỉ chặn theo đường dẫn, một lần sửa `matcher` là mất sạch. |
| `JWT_SECRET` | Fallback ngầm cả ở production | Throw nếu thiếu ở production | Quên set env ở production = token ai cũng giả mạo được. Kiểm tra **lúc dùng token**, không phải lúc import module — vì `next build` chạy với `NODE_ENV=production` và import mọi route để thu metadata. |
| `db` client | `export const db = drizzle(...)` chạy ngay lúc import | Khởi tạo lười qua Proxy | Cùng lý do: `next build` không được đòi `DATABASE_URL` khi không câu truy vấn nào thực sự chạy. |

> **Lưu ý phiên bản**: bản Next.js này (16.2.12) đã đổi tên `middleware.ts` → `proxy.ts`
> (hàm export cũng đổi từ `middleware` → `proxy`). Doc gốc:
> `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

## 4. Mô hình dữ liệu

15 bảng, chia 5 nhóm:

```
Tổ chức     branches ─┬─ employees ─ users
                      │
Khách & xe  customers ─── vehicles
                              │
Danh mục    services      parts ─── part_transactions
                │             │
Nghiệp vụ   appointments ─ service_orders ─┬─ service_order_labors
                                            └─ service_order_parts
                                                     │
                                                 invoices

Cấu hình    company_settings, automation_rules
```

### 4.1 Quy ước xuyên suốt

- **Tiền là `integer` VND**, không float. Cộng dồn hàng trăm dòng công/phụ tùng bằng float
  là nguồn lệch tiền kinh điển.
- **Thời lượng công lưu bằng phút** (`standardMinutes`, `actualMinutes`), không phải giờ thập phân.
- **Cột giá vốn nullable có chủ đích**: `null` = CHƯA BIẾT, khác hẳn `0` = "không tốn đồng nào".
  Thiếu phân biệt này thì báo cáo lãi lỗ coi mọi mặt hàng chưa nhập giá vốn là lãi 100% — con
  số sai mà nghe rất xuôi tai, đúng loại lỗi không ai phát hiện tới lúc quyết toán.
- **Snapshot mọi thứ in ra giấy**: tên, đơn giá, giá vốn, biển số đều được chép lại vào dòng
  chứng từ tại thời điểm lập. Sửa bảng giá hôm nay không được làm sai lệnh của tháng trước.

### 4.2 Các quyết định đáng giải thích

**`branches` đóng luôn vai trò kho phụ tùng** (thay vì tách `warehouses` riêng như v2). Trong
gara, kho phụ tùng luôn gắn với xưởng đang sửa xe; tách 2 khái niệm chỉ thêm một lần join mà
không có trường hợp dùng thật. Một kho phục vụ nhiều xưởng là mô hình chuỗi lớn — ngoài phạm vi.

**Lịch sử dịch vụ treo vào `vehicles`, không treo vào `customers`.** Xe đổi chủ thì lịch sử
bảo dưỡng phải đi theo xe, không theo người. `vehicles.customerId` là *chủ xe hiện tại* và
dùng `onDelete: "set null"` — xoá hồ sơ khách không được làm mất lịch sử của chiếc xe.

**`parts.code` unique theo `(branchId, code)`, không unique toàn cục.** Hai chi nhánh có kho
độc lập; ép unique toàn hệ thống sẽ chặn chi nhánh mới nhập đúng mặt hàng mà chi nhánh cũ đã có.

**Dòng công và dòng phụ tùng là hai bảng riêng** (`service_order_labors` /
`service_order_parts`) — khác v2 nơi một bảng `sales_invoice_items` là đủ. Hai loại dòng này
khác nhau về bản chất:

| | dòng công | dòng phụ tùng |
|---|---|---|
| Gắn với | kỹ thuật viên | kho |
| Tiến độ riêng | có (`status`, `actualMinutes`) | không |
| Trừ tồn kho | không | có |
| Giá vốn | theo giờ công của KTV | theo lô nhập |

Gộp một bảng thì quá nửa số cột luôn NULL ở một trong hai loại, và mọi truy vấn đều phải kèm
`WHERE kind = ...` — che mất chính điều khiến chúng khác nhau.

**`invoices` không có bảng dòng riêng.** Chi tiết hoá đơn đọc thẳng từ hai bảng dòng của lệnh
sửa chữa, vì chúng đã là snapshot bất biến. Nhân đôi sang bảng thứ ba chỉ tạo thêm một bản sao
có thể lệch, không thêm thông tin. Quan hệ 1–1 được ép bằng `serviceOrderId` unique.

**Tổng tiền lưu sẵn trên `service_orders`** (`laborTotal`, `partsTotal`, `discount`, `total`)
thay vì tính lại từ các dòng mỗi lần đọc — danh sách lệnh và báo cáo doanh thu phải đọc được
tổng mà không join 2 bảng con. Đổi lại: **mọi hàm thêm/sửa/xoá dòng phải cập nhật lại 4 cột này
trong cùng một `db.transaction()`**. Đây là ràng buộc bắt buộc, không phải tuỳ chọn.

**`vehicles.nextServiceAt` / `nextServiceOdometer` tính sẵn lúc đóng lệnh**, không suy ra lúc
chạy. Quy tắc "nhắc bảo dưỡng" phải trả lời được *"xe nào tới hạn"* bằng một câu `WHERE`, chứ
không quét toàn bộ lịch sử dịch vụ mỗi lần chạy.

**`automation_rules` có 3 cột ngưỡng riêng** (`thresholdQty` / `thresholdDays` / `thresholdKm`),
mỗi loại quy tắc dùng đúng một cột. Một cột `threshold` chung sẽ tiết kiệm 2 cột nhưng không
ai đọc nổi `threshold = 500` nghĩa là 500 cái, 500 ngày hay 500 km.

### 4.3 Vòng đời lệnh sửa chữa

```
received → diagnosing → quoted → approved → in_progress → completed → delivered
                                     └──────── cancelled ────────┘
```

Định nghĩa ở `src/server/domain.ts` (`SERVICE_ORDER_STATUSES`) cùng nhãn tiếng Việt. Trạng
thái được đọc ở ít nhất 4 nơi (danh sách lệnh, bảng điều xưởng, báo cáo, quy tắc tự động) —
gõ sai một chữ ở một chỗ là mất bản ghi khỏi bộ lọc mà không lỗi nào nổ ra, nên tất cả phải
lấy từ hằng số chung.

`ACTIVE_ORDER_STATUSES` = các trạng thái coi là "xe đang nằm trong xưởng", dùng cho KPI.

## 5. Phân quyền

3 cấp trên `users.role`: `staff` < `manager` < `admin`.

- `src/server/session.ts`: `getSessionUser()` (đọc cookie → verify → tra DB),
  `requireRole(min)` so sánh theo `ROLE_RANK`, kèm `requireUser/requireManager/requireAdmin`.
- `role: "admin"` dành cho đội dev — `ASSIGNABLE_ROLES = ["staff", "manager"]` là tập role duy
  nhất API quản lý tài khoản được phép gán. Khách hàng không tự tạo thêm admin từ UI.
- Tài khoản demo luôn được `seedDemoUser()` đảm bảo là `admin` (tự backfill nếu đã tồn tại từ
  trước) — đây là tài khoản chủ duy nhất để vào được khu quản trị lần đầu.
- **Kiểm tra quyền phải nằm trong từng Route Handler**, không dựa vào `proxy.ts`.

### 5.2 "Luồng" giao diện (bổ sung 19/08/2026) — khác hẳn role

`role` cấp **quyền** (được làm gì); `flow` chọn **bộ tính năng hiển thị** cho 3 kiểu người
dùng thật: quản lý (đủ tính năng), kế toán (chỉ Hoá đơn + Báo cáo doanh thu), KTV (chỉ Chấm
công + Khu vực nhận việc + Báo cáo công việc). Hai khái niệm tách nhau vì một quản lý có thể
đồng thời làm kế toán, nhưng vẫn cần thấy đủ mọi thứ.

`resolveUserFlow()` (`src/server/session.ts`): `role !== "staff"` → luôn `"manager"`. Với
`role === "staff"`: tra `users.employeeId` → nhân sự liên kết → chức vụ `"Kế toán"` /
`"Kỹ thuật viên"` cho ra flow tương ứng; không liên kết hoặc chức vụ khác → mặc định
`"manager"` (giữ hành vi cũ, tài khoản staff có sẵn không đột nhiên mất tính năng).

**Không phải hàng rào bảo mật** — giống `proxy.ts`, đây là điều hướng UI. `Sidebar.tsx` (client,
tự gọi `/api/auth/me` lấy `flow`) chỉ đổi menu hiển thị; hầu hết API phía sau (`invoices`,
`reports`...) vẫn nhận mọi `requireUser()`. Trang **Tài khoản** (`/dashboard/accounts`,
admin-only qua `requireAdmin()`) là nơi DUY NHẤT gán `employees` ↔ `users` — API
`PATCH /api/users/[id]` chặn gán trùng 1 nhân sự cho 2 tài khoản (kiểm tra thủ công, không
có ràng buộc `unique` ở DB vì `employeeId` vẫn hợp lệ khi `null`).

**Chấm công** (`attendance_logs`, bảng mới) là vào ca/ra ca đơn giản theo `employeeId`, **không**
gắn với lệnh sửa chữa cụ thể — khác `service_order_labors.actualMinutes` là giờ công của từng
dòng việc. Ràng buộc "mỗi nhân sự tối đa 1 ca đang mở" ép ở `store/attendance.ts`
(`getOpenAttendance()` trước khi `clockIn()`), không ép được bằng SQL thuần.

**"Khu vực nhận việc"** chỉ đọc (`listLaborsForTechnician()` trong `serviceOrders.ts`, câu
truy vấn DUY NHẤT trong file đó xuyên nhiều lệnh thay vì xoay quanh 1 lệnh) — quyết định nghiệp
vụ: KTV xem việc được giao, không tự nhận việc chưa gán ai. Cập nhật trạng thái/giờ công tái
dùng thẳng `PATCH /api/service-orders/[id]/labors/[laborId]` đã có sẵn (route đó chỉ yêu cầu
`requireUser()`, không giới hạn theo `technicianId` — KTV kỹ thuật có thể sửa dòng công của
người khác nếu tự gọi API trực tiếp; UI không cho làm việc đó, nhưng đây không phải hàng rào
cứng, ghi nhận như một giới hạn đã biết).

**Tổng hợp giờ công để tính lương (bổ sung 20/08/2026).** Trang "Chấm công" của KTV chỉ tự
phục vụ (xem ca của chính mình) — tổng hợp giờ công của TOÀN BỘ nhân sự để tính lương nằm ở
trang riêng `/dashboard/staff-attendance` (`GET /api/attendance/summary?period=day|week|month`,
`getAttendanceSummary()` trong `store/attendance.ts`). Quyết định nghiệp vụ (20/08/2026): **cả
kế toán lẫn quản lý** đều xem được (không phải chỉ 1 bên), và trang **chỉ hiện giờ công**, không
tự nhân với `employees.hourlyCost` ra số tiền — quy tắc lương thật (thưởng, phụ cấp, trừ phạt)
có thể phức tạp hơn phép nhân đơn thuần, để người tính tay dựa trên số giờ này an toàn hơn tự
tính sẵn rồi sai.

Khác `resolveUserFlow()` (chỉ đổi MENU hiển thị, không phải hàng rào), endpoint này có gác
thật: `requirePayrollViewer()` trong `session.ts` — cho qua nếu `role !== "staff"` (mọi
manager/admin), hoặc `role === "staff"` NHƯNG `resolveUserFlow()` ra đúng `"accountant"`.
Cố ý **không** dùng nguyên `resolveUserFlow() !== "technician"`: một tài khoản `staff` chưa
liên kết nhân sự cũng rơi vào flow `"manager"` (mặc định để không mất menu), nhưng không nên
vì vậy mà xem được giờ công của mọi người — dữ liệu chấm công nhạy cảm hơn menu.

Bẫy đã dính lúc viết câu SQL: tính `clockedInNow` (đang trong ca) bằng
`bool_or(clockOutAt is null)` sau một `LEFT JOIN` — nhân sự CHƯA TỪNG chấm công lần nào cũng
báo "đang trong ca", vì `LEFT JOIN` không khớp dòng nào thì cột đó cũng là `NULL`, và
`NULL is null` = true. Sửa bằng cách tách hẳn thành truy vấn riêng (không lọc theo kỳ báo cáo,
vì trạng thái "đang trong ca" phải là thật ngay lúc xem, không phải trong khung thời gian đã
chọn) rồi merge ở code, thay vì gộp chung 1 câu.

## 6. Xử lý lỗi API

`src/server/api.ts` cung cấp `apiError()` + các shortcut (`badRequest`, `unauthorized`,
`forbidden`, `notFound`, `conflict`) và wrapper `handle()`. Mọi Route Handler bọc thân hàm
trong `handle()` để lỗi ngoài dự kiến vẫn trả JSON `{ message }` đúng định dạng, thay vì trang
HTML 500 mặc định của Next — phía client parse JSON gặp HTML là nổ tiếp một lỗi thứ hai che
mất lỗi gốc. (ANSER v2 để mỗi route tự viết, và không có wrapper — hạn chế đã ghi nhận.)

## 7. Khởi động & seed

`src/instrumentation.ts` chạy một lần lúc server khởi động, gọi tuần tự (tất cả idempotent):

1. `seedDemoUser()` — tài khoản `demo@anser.auto` / `demo1234`, role `admin`.
2. `ensureDefaultBranch()` — tạo "Gara trung tâm" nếu chưa có chi nhánh nào.
3. `seedInitialData()` — 8 hạng mục dịch vụ, 7 phụ tùng, 5 nhân sự, 3 quy tắc tự động
   (chỉ seed khi bảng tương ứng đang rỗng).
4. `ensureCompanySettingsRow()` — tạo dòng cấu hình singleton.

## 8. Tự động hoá qua n8n

5 workflow trong `frontend/n8n-workflows/` (import thủ công qua n8n UI — xem README trong đó):
cảnh báo phụ tùng sắp hết, nhắc bảo dưỡng định kỳ, nhắc lịch hẹn, báo tiến độ sửa chữa, báo
cáo doanh thu.

### 8.1 Hai chiều giao tiếp

**n8n → app**: các endpoint `GET /api/n8n/internal/*` — `branches`, `low-stock`,
`due-for-service`, `appointments`, `revenue`. Trả JSON **snake_case** (phía tiêu thụ là biểu
thức trong n8n UI, không phải code TypeScript).

**app → n8n**: `triggerN8nWebhook()` — fire-and-forget, bọc try/catch, **không throw**: n8n tắt
không được làm hỏng luồng tiếp nhận xe. `notifyOrderStatusChanged()` là wrapper nghiệp vụ trên
nó, gọi từ `PATCH /api/service-orders/[id]` **sau khi commit đổi trạng thái**, không gọi trong
transaction — webhook chậm/lỗi không được giữ transaction mở hay làm rollback việc đã ghi
xong. Báo khách ở 3 mốc: `quoted`, `awaiting_acceptance` (không phải `completed` — xem mục
8.5), `delivered`.

### 8.2 Endpoint nội bộ có token, khác v2

ANSER v2 để `/api/n8n/internal/*` mở hoàn toàn ("n8n gọi server-to-server nên không cần
cookie"). Ở đây không được: dữ liệu trả về gồm tên, SĐT và email khách hàng. `checkInternalToken()`
(`src/server/internalAuth.ts`) áp quy tắc:

| `N8N_INTERNAL_TOKEN` | development | production |
|---|---|---|
| có | bắt buộc khớp header `X-Internal-Token` | bắt buộc khớp |
| trống | cho qua (import workflow là chạy được ngay) | **503** — thiếu cấu hình phải nổ ra, không được âm thầm thành endpoint công khai |

### 8.3 Hai quyết định trong workflow

**Thư nhắc gửi thẳng cho khách, kèm bản tổng hợp cho gara.** Khách không có email thì thư tự
động không tới được — nên endpoint trả `contactable` / `contactable_count`, và bản tổng hợp có
cột chỉ rõ khách nào phải gọi điện. Để những ca đó im lặng biến mất là cách chắc chắn nhất để
mất lịch hẹn mà không ai biết vì sao.

**Chỉ báo tiến độ ở 3 mốc** (`quoted`, `awaiting_acceptance`, `delivered` — xem mục 8.5), không
báo mọi lần đổi trạng thái — spam khách bằng `received → diagnosing` là cách nhanh nhất để
email của gara bị chặn.

**Giờ hẹn được format ở server** theo `Asia/Ho_Chi_Minh` (`scheduled_at_text`), không để node
Code trong n8n tự format: container n8n có thể chạy timezone khác, và email báo sai giờ hẹn còn
tệ hơn không gửi email nào.

### 8.4 Xem/tải mẫu workflow ngay trong UI (bổ sung 15/08/2026)

Trước đây muốn import workflow phải tự vào thư mục `n8n-workflows/` trên máy — không ai làm
việc đó nếu không phải người vừa code phần mềm. Trang **Tự động hoá** giờ có nút "Xem mẫu n8n"
ở mỗi quy tắc: mở modal xem nội dung JSON, sao chép, hoặc tải file `.json` để import thẳng vào
n8n UI (Workflows → Import from File).

File phục vụ tĩnh tại `public/n8n-templates/*.json`, **sinh tự động** từ
`n8n-workflows/*.json` bởi `scripts/sync-n8n-templates.mjs` — chạy qua hook `predev`/`prebuild`
trong `package.json` nên hai nơi không lệch nhau. `n8n-workflows/` vẫn là nguồn thật; sửa
workflow thì sửa ở đó, không sửa trong `public/` (bị ghi đè ở lần `dev`/`build` kế tiếp,
và thư mục này nằm trong `.gitignore`). Dùng file tĩnh thay vì một API route vì nội dung
không phụ thuộc dữ liệu người dùng hay phiên đăng nhập — không có lý do phải qua server mỗi lần.

**Lưu ý bảo mật khi thêm nội dung vào các file này:** `public/n8n-templates/*.json` là file
tĩnh, **không** đi qua `proxy.ts` (matcher chỉ chặn `/dashboard/:path*`) — bất kỳ ai chạm được
server đều tải được, không cần đăng nhập. Vì vậy các node HTTP Request trong workflow giữ
placeholder `REPLACE_WITH_N8N_INTERNAL_TOKEN` thay vì giá trị thật; token thật chỉ dán tay vào
trong n8n UI sau khi import, không bao giờ được bake vào file JSON nguồn.

### 8.4.1 Sự cố đã gặp: hai project Compose cùng tên "frontend"

Lúc bật Docker thật lần đầu (15/08/2026), `docker compose up -d` ở đây đã **vô tình xoá và
tạo lại** container n8n/MailHog của dự án anh em `ANSER-web-v2/frontend` (`anser-web-n8n`,
`anser-web-mailhog`). Nguyên nhân: Compose mặc định lấy tên project từ **tên thư mục chứa file
compose**, và cả hai thư mục đều tên `frontend` — nên cả hai bị Compose coi là *cùng một
project*. File compose chạy sau thấy container đã có nhưng cấu hình (`container_name`, volume)
lệch với file của nó, nên **recreate** (dừng + xoá container cũ, tạo container mới) để khớp.
Dữ liệu không mất (volume `frontend_anser_web_n8n_data` không bị xoá, chỉ bị tách khỏi
container), nhưng container thật đã bị dừng ngoài ý muốn — đã khôi phục bằng cách chạy lại
`docker compose -p frontend up -d` từ đúng thư mục `ANSER-web-v2/frontend` để nó gắn lại đúng
volume cũ.

**Cách chặn vĩnh viễn**: `docker-compose.yml` ở đây giờ có khai `name: anser_auto` ở đầu file —
ép Compose dùng tên project cố định, không suy ra từ tên thư mục nữa. `ANSER-web-v2/frontend`
hiện chưa có khai tương tự; nếu còn đụng lại, thêm `name: anser_web` bên đó (không tự sửa từ
phía dự án này — thuộc project khác).

### 8.4.2 Sự cố đã gặp: API key thiếu scope `workflow:activate`/`workflow:deactivate`

Lúc tạo `N8N_API_KEY` cho app (15/08/2026), scope được chọn theo suy đoán hợp lý —
`workflow:update` tưởng đã bao gồm cả việc bật/tắt workflow. **Sai**: bản n8n đang dùng
(2.20.x) tách bật/tắt thành 2 scope riêng, tên khác hẳn: `workflow:activate` và
`workflow:deactivate` (xác nhận qua `GET /rest/api-keys/scopes` khi đăng nhập bằng tài khoản
owner — đây là nơi duy nhất liệt kê đúng tên scope, Public API docs không liệt kê rõ). Thiếu 2
scope này khiến `activateN8nWorkflow()`/`deactivateN8nWorkflow()` trong `n8nApi.ts` — tức là
mọi lần bấm công tắc bật/tắt ở trang Tự động hoá — bị n8n trả **403 Forbidden**, dù các lệnh
đọc (`workflow:read`, `workflow:list`) vẫn chạy bình thường (nên `n8nConfigured` vẫn `true`,
dễ gây hiểu lầm là đã cấu hình đúng).

**Đã sửa**: thêm 2 scope còn thiếu vào đúng API key đang dùng (không đổi giá trị key, không
cần sửa `.env.local`). Nếu tạo lại `N8N_API_KEY` từ đầu sau này, scope tối thiểu cho app là:
`workflow:read`, `workflow:update`, `workflow:list`, `workflow:activate`, `workflow:deactivate`,
`execution:list`, `execution:read`, `credential:list`.

**Lưu ý riêng cho Public API (`/api/v1/...`) của bản n8n này**: có 2 khái niệm dễ nhầm —
`workflow:publish`/`workflow:unpublish` (liên quan tới tính năng "phiên bản workflow", **không**
gán được cho API key cá nhân — n8n trả `"Invalid scopes for user role"` nếu thử) khác hẳn
`workflow:activate`/`workflow:deactivate` (gán được, dùng đúng cho action bật/tắt qua
`/api/v1/workflows/:id/activate`). Việc **activate qua Public API với API key** hoạt động bình
thường một khi có đúng scope — không cần phiên đăng nhập nội bộ như lúc import lần đầu (lúc đó
lỗi 403 là do dùng key tạm thiếu đúng 2 scope này, không phải do giới hạn của Public API).

## 8.5 Nghiệp vụ thật của gara 2 xưởng (bổ sung 13/08/2026)

`ANSER Auto` là phần mềm thật cho gara của gia đình người dùng: 1 xưởng chính (sửa máy,
động cơ) + 1 xưởng phụ (sơn, gò, hàn). Ba khoảng lệch giữa thiết kế ban đầu và nghiệp vụ
thật đã được hỏi lại và cài đặt:

**Dòng công gán riêng xưởng, lệnh vẫn chỉ có một.** Xe tai nạn cần cả 2 xưởng không tách
thành 2 lệnh — `service_order_labors` có thêm cột `branchId` (nullable, khác
`serviceOrders.branchId` là xưởng *tiếp nhận*). Không truyền khi thêm dòng công thì tự điền
bằng xưởng tiếp nhận (`addLabor()`); gara chỉ có 1 xưởng thì cột này im lặng không hiện trên
UI (`showLaborBranch = branches.length > 1`).

**Phụ tùng đặt ngoài là một luồng riêng, không tái dùng `serviceOrderParts`.** Bảng mới
`service_order_special_orders` theo dõi vòng đời `ordered` (đã đặt, giá có thể chưa rõ) →
`arrived` (hàng về, có giá vốn thật) → `billed` (đã chuyển thành 1 dòng `serviceOrderParts`,
tính vào hoá đơn) hoặc `cancelled`. **Không tính vào tổng tiền lệnh cho tới khi `billed`** —
báo giá cho khách không được gồm phụ tùng còn "chưa chắc đặt được". Khác `addPart()` (xuất
từ tồn kho có sẵn, trừ kho ngay), luồng này **không đụng `parts.stock`** — hàng không thuộc
kho gara. `store/specialOrders.ts` có `createSpecialOrder → markArrived → billSpecialOrder`
(hoặc `cancelSpecialOrder` ở bất kỳ bước nào trước `billed`).

**"Chờ nghiệm thu" là trạng thái duy nhất lùi được.** Thêm `awaiting_acceptance` vào
`SERVICE_ORDER_STATUSES`, giữa `completed` và `delivered`. Khách nghiệm thu không đồng ý là
tình huống có thật (không phải giả định) — lùi về `in_progress` qua `REVERTIBLE_FROM`, giữ
nguyên toàn bộ dòng công/phụ tùng đã có. `notifyOrderStatusChanged()` đổi mốc báo khách từ
`completed` sang `awaiting_acceptance`: "hoàn tất" chỉ là xưởng xong việc kỹ thuật,
"chờ nghiệm thu" mới là lúc mời khách tới. API `PATCH /api/service-orders/[id]` chặn mọi
bước nhảy cóc (`validateTransition()` trong route — chỉ cho đi tiếp đúng 1 bước theo
`SERVICE_ORDER_STATUSES`, lùi đúng bước đã khai trong `REVERTIBLE_FROM`, hoặc huỷ).

## 9. Quy tắc nghiệp vụ đã cài đặt

Những ràng buộc dưới đây được ép ở tầng store, không phải chỉ ở UI — API gọi thẳng cũng
không lách được.

| Quy tắc | Nơi ép | Vì sao |
|---|---|---|
| Thêm phụ tùng vào lệnh làm 4 việc trong 1 transaction: trừ kho, ghi phiếu xuất, thêm dòng, tính lại tổng | `serviceOrders.addPart()` | Thiếu bước nào cũng lệch sổ: trừ kho không có dòng thì hàng biến mất không ai trả tiền |
| Khoá dòng `parts` bằng `SELECT ... FOR UPDATE` khi xuất | `addPart()`, `createPartTransaction()` | Hai lệnh cùng lấy 1 mã tồn 5, cùng trừ 3, phải ra lỗi chứ không ra âm 1 |
| Bỏ dòng phụ tùng → trả hàng về kho + ghi phiếu nhập đối ứng | `serviceOrders.removePart()` | Phiếu xuất ghi việc đã xảy ra; xoá nó đi là sửa lịch sử |
| Lệnh `delivered`/`cancelled` không sửa được nội dung | `assertUnlocked()` | Sửa lệnh đã xuất hoá đơn làm doanh thu đã báo cáo lệch |
| Mã `RO-`/`HD-` sinh bằng Postgres sequence | `store/codes.ts` | `count(*)+1` có race condition — đúng chỗ ANSER v2 đã dính |
| Biển số chuẩn hoá trước khi lưu/tra cứu | `vehicles.normalizePlate()` | `30A-123.45` và `30a 12345` là một xe; không chuẩn hoá thì unique vô dụng |
| Số km chỉ được tăng, không lùi | `createServiceOrder()` | Gõ thiếu một chữ số không được phá mốc bảo dưỡng theo km |
| Mốc bảo dưỡng đặt khi giao xe, theo chu kỳ trong Cài đặt | `applyMaintenanceMilestone()` | Tính sẵn để quy tắc nhắc lịch chỉ cần một câu `WHERE` |
| Thuế tính trên số **sau** giảm giá | `invoices.createInvoice()` | Tính trên số trước giảm là thu thuế phần khách không trả |
| Trạng thái thanh toán suy ra từ số tiền | `derivePaymentStatus()` | Chọn tay là mở cửa cho "đã thanh toán" mà thu 0đ |
| `recordPayment` nhận số **luỹ kế**, không phải số cộng thêm | `invoices.recordPayment()` | Gửi lại cùng request (mạng chập, bấm đúp) không được cộng tiền hai lần |
| 1 lệnh ↔ tối đa 1 hoá đơn | unique trên `invoices.serviceOrderId` | |
| Xe/phụ tùng đã có lịch sử thì không xoá được | route `DELETE` tương ứng | Xoá sẽ cascade mất lịch sử, không lấy lại được |
| Đổi trạng thái lệnh chỉ đi tiếp 1 bước, lùi đúng bước đã khai, hoặc huỷ | `validateTransition()` trong route `PATCH /api/service-orders/[id]` | Nhảy cóc (vd "đã tiếp nhận" → "đã giao xe") là một việc thật chưa chắc đã làm |
| Đặt hàng ngoài không tính vào tổng lệnh tới khi `billed` | `store/specialOrders.ts` | Báo giá cho khách không được gồm phụ tùng "chưa chắc đặt được" |
| Đặt hàng ngoài không trừ `parts.stock` | `billSpecialOrder()` | Hàng không thuộc kho gara, không phải hàng tồn có sẵn |

## 10. Việc cần làm tiếp

| Việc | Ghi chú |
|---|---|
| Xoá tài khoản đăng nhập | Trang **Tài khoản** (`/dashboard/accounts`) sửa role + liên kết nhân sự được, nhưng chưa có nút xoá — `users.ts` có sẵn `deleteUser()` ở tầng store, chỉ chưa có route/nút gọi tới. |
| Xác nhận workflow n8n tự chạy đúng giờ | Cả 5 workflow đã import + Active thật trong n8n (19/08/2026), test tay từng bước (webhook, endpoint nội bộ) đều đúng — nhưng chưa có lần nào workflow tự nổ theo lịch (6h/ngày/giờ) và gửi email thật qua MailHog mà không có ai kích hoạt tay để xác nhận. |
| Ngưỡng quy tắc chưa được workflow đọc | Trang Tự động hoá sửa được `threshold*` trong DB, nhưng workflow truyền tham số cứng trong URL. Cần cho endpoint `/api/n8n/internal/*` tự đọc rule thay vì nhận query param. |
| Validate input bằng `zod` | Hiện đang validate thủ công (`if (!x)`) ở từng route. |
| Rate-limit `/api/auth/login` | Chưa có — dễ brute-force mật khẩu. |
| Index DB | Chưa có index nào ngoài PK/unique. Cần cho `service_orders.status`, `service_orders.vehicleId`, `part_transactions.partId`, `invoices.issuedAt`. |
| Gộp truy vấn trang Tổng quan | `getOverviewSummary()` chạy 8 truy vấn tuần tự qua WebSocket tới Neon — đo được ~3.4s ở lần tải đầu từ Việt Nam. |
| In hoá đơn | Chưa có bản in/PDF cho khách. |
| Trang quản lý Chi nhánh | API `/api/branches` đã có CRUD đầy đủ, nhưng không có trang `/dashboard/branches` — sửa/thêm chi nhánh hiện phải gọi API tay. |
| Ô tìm kiếm + chuông thông báo ở Topbar | Chỉ là UI trang trí, chưa gắn logic (không tìm được gì, chuông không có thông báo thật). |
