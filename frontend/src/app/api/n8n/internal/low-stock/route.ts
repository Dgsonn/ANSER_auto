import { NextResponse } from "next/server";
import { handle, notFound } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { getBranchById } from "@/server/store/branches";
import { listLowStockParts } from "@/server/store/parts";

export const dynamic = "force-dynamic";

// GET /api/n8n/internal/low-stock?branchId=...&threshold=...
// Không truyền branchId thì tính trên toàn bộ chi nhánh.
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const url = new URL(request.url);
    const branchId = url.searchParams.get("branchId") ?? undefined;
    const thresholdParam = url.searchParams.get("threshold");
    const fallbackThreshold = thresholdParam ? Number(thresholdParam) : undefined;

    let branchName: string | null = null;
    if (branchId) {
      const branch = await getBranchById(branchId);
      if (!branch) return notFound("Không tìm thấy chi nhánh.");
      branchName = branch.name;
    }

    const items = await listLowStockParts({
      branchId,
      fallbackThreshold: Number.isFinite(fallbackThreshold) ? fallbackThreshold : undefined,
    });

    return NextResponse.json({
      branch_id: branchId ?? null,
      branch_name: branchName,
      count: items.length,
      items: items.map((part) => ({
        code: part.code,
        name: part.name,
        category: part.category,
        oem_number: part.oemNumber,
        unit: part.unit,
        stock: part.stock,
        threshold: part.threshold,
        location: part.location,
      })),
    });
  });
}
