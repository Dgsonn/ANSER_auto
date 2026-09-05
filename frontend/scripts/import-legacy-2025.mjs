// Import một lần dữ liệu thật năm 2025 (bán hàng / mua hàng / tồn kho) do mẹ người dùng
// gửi qua Excel. Đọc từ file JSON đã làm sạch bằng script Python (scratchpad, không commit),
// KHÔNG đọc trực tiếp Excel. Dùng SQL thô qua cùng driver `@neondatabase/serverless` mà
// `src/server/db/client.ts` dùng (không import schema.ts trực tiếp — .mjs không chạy được
// TypeScript mà không thêm loader mới chỉ cho 1 script dùng một lần).
//
// Idempotent theo `parts.code` (trong 1 chi nhánh); sales/purchase ledger không có khoá tự
// nhiên đáng tin trong dữ liệu gốc nên script chỉ insert khi bảng tương ứng đang RỖNG —
// chạy lại sau khi đã có dữ liệu sẽ tự bỏ qua, không tạo trùng.
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

async function importSalesLedger() {
  const { rows } = await pool.query(`select count(*)::int as count from sales_ledger`);
  if (rows[0].count > 0) {
    console.log(
      `sales_ledger: bỏ qua (đã có ${rows[0].count} dòng — chỉ chạy trên bảng rỗng để tránh trùng).`,
    );
    return;
  }
  for (const s of data.sales) {
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
  console.log(`sales_ledger: đã thêm ${data.sales.length} dòng.`);
}

async function importPurchaseLedger() {
  const { rows } = await pool.query(`select count(*)::int as count from purchase_ledger`);
  if (rows[0].count > 0) {
    console.log(
      `purchase_ledger: bỏ qua (đã có ${rows[0].count} dòng — chỉ chạy trên bảng rỗng để tránh trùng).`,
    );
    return;
  }
  for (const p of data.purchases) {
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
  console.log(`purchase_ledger: đã thêm ${data.purchases.length} dòng.`);
}

const branchId = await findBodyworkBranch();
await importParts(branchId);
await importSalesLedger();
await importPurchaseLedger();
console.log("Xong.");
await pool.end();
