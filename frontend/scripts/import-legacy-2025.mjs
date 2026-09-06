// Import dữ liệu thật (bán hàng / mua hàng / tồn kho) do mẹ người dùng gửi qua Excel — dùng
// lại được cho MỌI đợt sau này (không chỉ đợt 2025 đầu tiên), miễn JSON đầu vào đúng cấu
// trúc (xem scratchpad/export_legacy.py). Đọc từ file JSON đã làm sạch, KHÔNG đọc trực tiếp
// Excel. Dùng SQL thô qua cùng driver `@neondatabase/serverless` mà `src/server/db/client.ts`
// dùng (không import schema.ts trực tiếp — .mjs không chạy được TypeScript mà không thêm
// loader mới chỉ cho 1 script).
//
// Idempotent theo từng dòng, chạy lại/chạy với đợt dữ liệu mới đều an toàn:
// - parts: khoá tự nhiên là `code` trong 1 chi nhánh — chỉ thêm mã CHƯA có, không sửa lại
//   tồn kho của mã đã có (mã cũ có thể đã bị lệch đi vì nhập/xuất thật qua app từ lúc import
//   trước, ghi đè theo Excel cũ hơn là sai — nếu cần cập nhật tồn, sửa tay qua UI Kho phụ tùng).
// - sales_ledger / purchase_ledger: không có khoá tự nhiên rõ ràng trong dữ liệu gốc — dùng
//   khoá ghép (số chứng từ + ngày) làm định danh, chỉ thêm dòng nào chưa từng có khoá đó.
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const JSON_PATH = process.argv[2];
if (!JSON_PATH) {
  console.error("Dùng: node scripts/import-legacy-2025.mjs <đường-dẫn-legacy_data.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 781 phụ tùng tồn kho là vật tư đồng-sơn thật (cửa, kính, doăng, gương, đèn...) — phải vào
// đúng chi nhánh "Xuong son go han" đã có sẵn trong DB, không phải chi nhánh gara chính.
async function findBodyworkBranch() {
  const { rows } = await pool.query(
    `select id, name from branches where name ilike $1 limit 1`,
    ["%son go han%"],
  );
  if (rows.length === 0) {
    throw new Error('Không tìm thấy chi nhánh "Xuong son go han" trong bảng branches.');
  }
  return rows[0].id;
}

async function importParts(branchId) {
  const { rows: existing } = await pool.query(
    `select code from parts where branch_id = $1`,
    [branchId],
  );
  const existingCodes = new Set(existing.map((r) => r.code));
  const toInsert = data.parts.filter((p) => !existingCodes.has(p.code));

  if (toInsert.length === 0) {
    console.log(`parts: bỏ qua (đã có đủ ${data.parts.length} mã, không có mã mới).`);
    return;
  }

  for (const p of toInsert) {
    await pool.query(
      `insert into parts (code, name, category, unit, stock, cost, price, branch_id)
       values ($1, $2, $3, $4, $5, $6, 0, $7)`,
      [p.code, p.name, p.category, p.unit, p.stock, p.cost, branchId],
    );
  }
  console.log(
    `parts: đã thêm ${toInsert.length} (bỏ qua ${data.parts.length - toInsert.length} mã đã tồn tại).`,
  );
}

// Khoá ghép "số chứng từ + ngày (yyyy-mm-dd)" — đủ để coi 2 dòng là cùng 1 chứng từ thật,
// không cần chuẩn xác tuyệt đối như UUID vì mục đích chỉ là chặn import trùng giữa các đợt.
function voucherKey(voucherNo, dateIso) {
  return `${voucherNo ?? ""}__${(dateIso ?? "").slice(0, 10)}`;
}

async function importSalesLedger() {
  const { rows: existing } = await pool.query(
    `select voucher_no, voucher_date from sales_ledger`,
  );
  const existingKeys = new Set(
    existing.map((r) => voucherKey(r.voucher_no, r.voucher_date.toISOString())),
  );
  const toInsert = data.sales.filter((s) => !existingKeys.has(voucherKey(s.voucherNo, s.voucherDate)));

  if (toInsert.length === 0) {
    console.log(`sales_ledger: bỏ qua (đã có đủ ${data.sales.length} chứng từ, không có dòng mới).`);
    return;
  }
  for (const s of toInsert) {
    await pool.query(
      `insert into sales_ledger
         (voucher_date, voucher_no, invoice_no, partner_name, amount_before_tax, vat_amount,
          total_amount, invoice_issued, goods_delivered)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        s.voucherDate,
        s.voucherNo,
        s.invoiceNo,
        s.partnerName,
        s.amountBeforeTax,
        s.vatAmount,
        s.totalAmount,
        s.invoiceIssued,
        s.goodsDelivered,
      ],
    );
  }
  console.log(
    `sales_ledger: đã thêm ${toInsert.length} (bỏ qua ${data.sales.length - toInsert.length} chứng từ đã có).`,
  );
}

async function importPurchaseLedger() {
  const { rows: existing } = await pool.query(
    `select voucher_no, posting_date from purchase_ledger`,
  );
  const existingKeys = new Set(
    existing.map((r) => voucherKey(r.voucher_no, r.posting_date.toISOString())),
  );
  const toInsert = data.purchases.filter(
    (p) => !existingKeys.has(voucherKey(p.voucherNo, p.postingDate)),
  );

  if (toInsert.length === 0) {
    console.log(
      `purchase_ledger: bỏ qua (đã có đủ ${data.purchases.length} chứng từ, không có dòng mới).`,
    );
    return;
  }
  for (const p of toInsert) {
    await pool.query(
      `insert into purchase_ledger
         (posting_date, voucher_date, voucher_no, invoice_no, partner_name, description,
          amount_before_tax, discount_amount, vat_amount, total_amount, purchase_cost,
          inventory_value, invoice_status, is_purchase_cost, document_type)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        p.postingDate,
        p.voucherDate,
        p.voucherNo,
        p.invoiceNo,
        p.partnerName,
        p.description,
        p.amountBeforeTax,
        p.discountAmount,
        p.vatAmount,
        p.totalAmount,
        p.purchaseCost,
        p.inventoryValue,
        p.invoiceStatus,
        p.isPurchaseCost,
        p.documentType,
      ],
    );
  }
  console.log(
    `purchase_ledger: đã thêm ${toInsert.length} (bỏ qua ${data.purchases.length - toInsert.length} chứng từ đã có).`,
  );
}

const branchId = await findBodyworkBranch();
await importParts(branchId);
await importSalesLedger();
await importPurchaseLedger();
console.log("Xong.");
await pool.end();
