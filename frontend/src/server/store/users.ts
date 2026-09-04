import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

export type User = typeof users.$inferSelect;
export const ROLES = ["staff", "manager", "admin"] as const;
export type Role = (typeof ROLES)[number];
// "admin" dành riêng cho đội dev — khách hàng chỉ tự quản lý nhân sự của họ ở 2 cấp
// này qua trang Nhân sự (không tạo/thăng cấp lên admin được từ UI/API).
export const ASSIGNABLE_ROLES = ["staff", "manager"] as const;

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return rows[0];
}

export async function findUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function listUsers() {
  return db.select().from(users).orderBy(asc(users.firstName));
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role?: Role;
  employeeId?: string;
}): Promise<User> {
  const rows = await db
    .insert(users)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash: input.passwordHash,
      role: input.role ?? "staff",
      employeeId: input.employeeId,
    })
    .returning();
  return rows[0];
}

export async function updateUser(
  id: string,
  patch: Partial<{
    firstName: string;
    lastName: string;
    phone: string | null;
    passwordHash: string;
    role: Role;
    employeeId: string | null;
  }>,
): Promise<User | undefined> {
  const rows = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  return rows[0];
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

export async function countAdmins() {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return rows.length;
}

// Bỏ passwordHash trước khi trả ra ngoài — mọi route trả thông tin user đều phải đi
// qua hàm này thay vì tự chọn field, để thêm cột nhạy cảm sau này không lọt ra API.
export function toPublicUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

// Tài khoản demo hiện sẵn dưới dạng nút điền nhanh ở trang đăng nhập.
export const DEMO_ACCOUNT = {
  firstName: "Demo",
  lastName: "Garage",
  email: "demo@anser.auto",
  password: "demo1234",
};

export async function seedDemoUser() {
  const existing = await findUserByEmail(DEMO_ACCOUNT.email);
  if (existing) {
    // Tài khoản demo phải luôn là admin — không thì không ai vào được trang Nhân sự
    // sau khi nâng cấp từ bản chưa có phân quyền.
    if (existing.role !== "admin") await updateUser(existing.id, { role: "admin" });
    return;
  }
  await createUser({
    firstName: DEMO_ACCOUNT.firstName,
    lastName: DEMO_ACCOUNT.lastName,
    email: DEMO_ACCOUNT.email,
    passwordHash: bcrypt.hashSync(DEMO_ACCOUNT.password, 10),
    role: "admin",
  });
}
