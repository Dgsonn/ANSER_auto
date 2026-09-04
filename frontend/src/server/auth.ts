import jwt from "jsonwebtoken";

const FALLBACK_SECRET = "dev-secret-change-me";

export const COOKIE_NAME = "anser_auto_token";

// Kiểm tra LÚC DÙNG, không phải lúc import module: `next build` chạy với
// NODE_ENV=production và import mọi route để thu thập metadata, nên throw ở tầng
// module sẽ làm build fail trên máy chưa có secret — dù không token nào được ký.
// Ở đây vẫn fail-fast đúng lúc quan trọng: mọi thao tác ký/verify token thật.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }
  return FALLBACK_SECRET;
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: string } | null {
  // Lấy secret NGOÀI try: thiếu cấu hình là lỗi vận hành phải nổ ra, không được lẫn
  // vào nhánh "token không hợp lệ" khiến cả hệ thống lặng lẽ đăng xuất mọi người.
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret) as { sub: string };
  } catch {
    return null;
  }
}

export const authCookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // Giây (không phải ms như res.cookie của Express).
  maxAge: 7 * 24 * 60 * 60,
};
