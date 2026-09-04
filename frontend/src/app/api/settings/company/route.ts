import { NextResponse } from "next/server";
import { badRequest, forbidden, handle, unauthorized } from "@/server/api";
import { requireManager, requireUser } from "@/server/session";
import { getCompanySettings, updateCompanySettings } from "@/server/store/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    return NextResponse.json({ settings: await getCompanySettings() });
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    if (!(await requireManager())) return forbidden("Chỉ quản lý trở lên mới sửa được cài đặt.");

    const body = await request.json().catch(() => ({}));
    const patch: Parameters<typeof updateCompanySettings>[0] = {};

    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    for (const field of ["address", "phone", "email", "taxCode"] as const) {
      if (field in body) patch[field] = body[field]?.trim() || null;
    }
    if (body.currency === "VND" || body.currency === "USD") patch.currency = body.currency;

    if ("defaultTaxRate" in body) {
      const rate = Number(body.defaultTaxRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return badRequest("Thuế suất phải trong khoảng 0–100.");
      }
      patch.defaultTaxRate = rate;
    }
    if ("defaultLaborRate" in body) patch.defaultLaborRate = Number(body.defaultLaborRate) || 0;
    if ("maintenanceIntervalDays" in body) {
      const days = Number(body.maintenanceIntervalDays);
      if (!Number.isFinite(days) || days <= 0) return badRequest("Chu kỳ bảo dưỡng phải lớn hơn 0.");
      patch.maintenanceIntervalDays = days;
    }
    if ("maintenanceIntervalKm" in body) {
      const km = Number(body.maintenanceIntervalKm);
      if (!Number.isFinite(km) || km <= 0) return badRequest("Chu kỳ bảo dưỡng theo km phải lớn hơn 0.");
      patch.maintenanceIntervalKm = km;
    }

    if (Object.keys(patch).length === 0) return badRequest("Không có thay đổi nào.");

    return NextResponse.json({ settings: await updateCompanySettings(patch) });
  });
}
