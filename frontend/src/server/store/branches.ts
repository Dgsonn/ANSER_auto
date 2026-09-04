import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { branches } from "@/server/db/schema";

export type Branch = typeof branches.$inferSelect;

export async function listBranches() {
  return db.select().from(branches).orderBy(asc(branches.name));
}

export async function getBranchById(id: string): Promise<Branch | undefined> {
  const rows = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return rows[0];
}

export async function createBranch(input: {
  name: string;
  address?: string | null;
  phone?: string | null;
  notificationEmail?: string | null;
}) {
  const [existing] = await db.select().from(branches).where(eq(branches.name, input.name)).limit(1);
  if (existing) throw new Error("Tên chi nhánh đã tồn tại.");
  const [branch] = await db.insert(branches).values(input).returning();
  return branch;
}

export async function updateBranch(
  id: string,
  patch: Partial<{
    name: string;
    address: string | null;
    phone: string | null;
    notificationEmail: string | null;
  }>,
) {
  const [branch] = await db.update(branches).set(patch).where(eq(branches.id, id)).returning();
  return branch;
}
