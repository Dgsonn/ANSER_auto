import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { companySettings } from "@/server/db/schema";

export type CompanySettings = typeof companySettings.$inferSelect;

// Singleton: tạo dòng đầu tiên nếu DB trống, lấy dòng đầu nếu đã có. Idempotent.
export async function ensureCompanySettingsRow(): Promise<CompanySettings> {
  const rows = await db.select().from(companySettings).limit(1);
  if (rows.length > 0) return rows[0];
  const created = await db.insert(companySettings).values({ name: "ANSER Auto" }).returning();
  return created[0];
}

export async function getCompanySettings() {
  return ensureCompanySettingsRow();
}

export async function updateCompanySettings(
  patch: Partial<{
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    taxCode: string | null;
    currency: string;
    defaultTaxRate: number;
    defaultLaborRate: number;
    maintenanceIntervalDays: number;
    maintenanceIntervalKm: number;
  }>,
) {
  const current = await ensureCompanySettingsRow();
  const rows = await db
    .update(companySettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(companySettings.id, current.id))
    .returning();
  return rows[0];
}
