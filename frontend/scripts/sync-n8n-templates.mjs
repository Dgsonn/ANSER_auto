// Chép n8n-workflows/*.json sang public/n8n-templates/*.json để trang Tự động hoá trong app
// có thể phục vụ (xem/tải) trực tiếp qua HTTP, không bắt người dùng tự vào thư mục repo.
//
// n8n-workflows/ là nguồn thật (sửa nội dung workflow thì sửa ở đó); public/n8n-templates/
// là bản sinh ra, không sửa tay. Chạy tự động trước `dev` và `build` (xem package.json) nên
// hai nơi không bao giờ lệch nhau lâu.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, "n8n-workflows");
const outDir = join(root, "public", "n8n-templates");

mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const content = readFileSync(join(srcDir, file), "utf8");
  // Xác nhận là JSON hợp lệ trước khi chép — lỗi cú pháp trong workflow nên chặn ngay ở đây,
  // không để lộ ra tận lúc người dùng bấm "Xem mẫu" trong app.
  JSON.parse(content);
  writeFileSync(join(outDir, file), content, "utf8");
}

console.log(`[sync-n8n-templates] Đã chép ${files.length} file sang public/n8n-templates/`);
