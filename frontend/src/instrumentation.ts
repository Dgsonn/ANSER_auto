// Hook chuẩn của Next.js — chạy 1 lần lúc server khởi động. Mọi hàm gọi ở đây đều
// idempotent nên chạy lại nhiều lần không sinh dữ liệu trùng.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedDemoUser } = await import("@/server/store/users");
    const { ensureDefaultBranch, seedInitialData } = await import("@/server/store/seed");
    const { ensureCompanySettingsRow } = await import("@/server/store/settings");

    await seedDemoUser();
    await ensureDefaultBranch();
    await seedInitialData();
    await ensureCompanySettingsRow();
  }
}
